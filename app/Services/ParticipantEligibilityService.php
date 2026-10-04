<?php

namespace App\Services;

use App\Models\Athlete;
use App\Models\Event;
use App\Models\EventMatchCategory;
use App\Models\Registration;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

class ParticipantEligibilityService
{
    public function enabled(Event $event): bool
    {
        return (bool) ($event->participant_rules['enabled'] ?? false);
    }

    /** @return array<string, list<string>> */
    public function schoolInputRules(): array
    {
        return [
            'school_name' => ['nullable', 'string', 'max:255'],
            'school_level' => ['nullable', 'in:SMP,MTs,SMA,SMK,MA'],
            'school_entry_year' => ['nullable', 'integer', 'between:1990,2100'],
            'school_grade' => ['nullable', 'integer', 'between:7,13'],
        ];
    }

    public function expectedGrade(Event $event, Athlete $athlete): ?int
    {
        if (! $athlete->school_entry_year || ! in_array($athlete->school_level, ['SMP', 'MTs', 'SMA', 'SMK', 'MA'], true)) {
            return null;
        }

        return (in_array($athlete->school_level, ['SMP', 'MTs'], true) ? 7 : 10)
            + (int) ($event->participant_rules['academic_year_start'] ?? 0) - $athlete->school_entry_year;
    }

    /** @return array<string, string> */
    public function profileErrors(Event $event, Athlete $athlete): array
    {
        if (! $this->enabled($event)) {
            return [];
        }
        $rules = $event->participant_rules;
        $errors = [];
        $reference = CarbonImmutable::parse($rules['age_reference_date']);
        if (! $athlete->birth_date) {
            $errors['birth_date'] = 'Tanggal lahir wajib diisi untuk persyaratan event ini.';
        } else {
            $birth = CarbonImmutable::instance($athlete->birth_date);
            if ($birth->gt($reference) || $birth->addYearsNoOverflow((int) $rules['max_age_years'] + 1)->lte($reference)) {
                $errors['birth_date'] = "Usia maksimal {$rules['max_age_years']} tahun pada ".$reference->translatedFormat('d F Y').'.';
            }
            if (! empty($rules['birth_date_from']) && $birth->lt($rules['birth_date_from'])) {
                $errors['birth_date'] = 'Tanggal lahir paling awal yang diizinkan adalah '.CarbonImmutable::parse($rules['birth_date_from'])->translatedFormat('d F Y').'.';
            }
        }
        if (! trim((string) $athlete->school_name)) {
            $errors['school_name'] = 'Nama sekolah aktif wajib diisi.';
        }
        if (! in_array($athlete->school_level, ['SMP', 'MTs', 'SMA', 'SMK', 'MA'], true)) {
            $errors['school_level'] = 'Pilih jenjang sekolah aktif.';
        }
        if (! $athlete->school_entry_year) {
            $errors['school_entry_year'] = 'Isi tahun pertama masuk kelas VII atau kelas X pada jenjang ini, bukan tahun pindah sekolah.';
        }
        if (! $athlete->school_grade) {
            $errors['school_grade'] = 'Kelas pada tahun ajaran event wajib diisi.';
        } elseif ($athlete->school_grade > (int) $rules['max_school_grade']) {
            $errors['school_grade'] = 'Maksimal kelas '.$this->gradeLabel((int) $rules['max_school_grade']).'; kelas '.$this->gradeLabel($athlete->school_grade).' tidak diizinkan meskipun usia memenuhi.';
        } elseif (in_array($athlete->school_level, ['SMP', 'MTs'], true) ? ! in_array($athlete->school_grade, [7, 8, 9], true) : ! in_array($athlete->school_grade, [10, 11, 12, 13], true)) {
            $errors['school_grade'] = 'Kelas tidak sesuai dengan jenjang sekolah.';
        }
        $expected = $this->expectedGrade($event, $athlete);
        if ($expected !== null && $athlete->school_grade && $expected !== $athlete->school_grade) {
            $errors['school_entry_year'] = "Tahun masuk menunjukkan kelas {$this->gradeLabel($expected)} pada tahun ajaran {$rules['academic_year_start']}/".($rules['academic_year_start'] + 1).'. Periksa kelas dan tahun masuk; hubungi panitia jika riwayat pendidikan berbeda.';
        }

        return $errors;
    }

    public function validateProfile(Event $event, Athlete $athlete): void
    {
        $errors = $this->profileErrors($event, $athlete);
        if ($errors) {
            throw ValidationException::withMessages($errors);
        }
    }

    public function validateCategory(Event $event, Athlete $athlete, EventMatchCategory $category, string $errorKey = 'category_ids'): void
    {
        if (! $this->enabled($event)) {
            return;
        }
        $this->validateProfile($event, $athlete);
        $rules = $event->participant_rules;
        $type = $category->type === 'embu' ? 'embu' : 'randori';
        $months = (int) $rules[$type.'_min_age_months'];
        $oldEnough = CarbonImmutable::instance($athlete->birth_date)->addMonthsNoOverflow($months)
            ->lte(CarbonImmutable::parse($rules['age_reference_date']));
        $schoolAlternative = $type === 'embu' && ! empty($rules['embu_min_school_grade'])
            && $athlete->school_grade >= (int) $rules['embu_min_school_grade'];
        if (! $oldEnough && ! $schoolAlternative) {
            throw ValidationException::withMessages([$errorKey => "{$category->name}: minimal usia {$this->ageLabel($months)}".($type === 'embu' && ! empty($rules['embu_min_school_grade']) ? ' atau minimal kelas '.$this->gradeLabel((int) $rules['embu_min_school_grade']) : '').' pada tanggal acuan event.']);
        }
    }

    public function verificationHash(Event $event, Athlete $athlete): string
    {
        $rules = $event->participant_rules ?? [];
        ksort($rules);

        return hash('sha256', json_encode([$event->id, $rules, $athlete->name, $athlete->nik,
            $athlete->birth_date?->format('Y-m-d'), $athlete->school_name, $athlete->school_level,
            $athlete->school_entry_year, $athlete->school_grade, $athlete->school_document_path], JSON_THROW_ON_ERROR));
    }

    public function schoolVerified(Event $event, Athlete $athlete): bool
    {
        return $athlete->school_verified_at !== null
            && hash_equals($this->verificationHash($event, $athlete), (string) $athlete->school_verification_hash);
    }

    public function validateSchoolDocument(Event $event, Athlete $athlete): void
    {
        if (! $athlete->school_document_path) {
            if ($event->participant_rules['require_school_document'] ?? false) {
                throw ValidationException::withMessages(['school_document' => 'Event ini mewajibkan bukti sekolah sebelum diverifikasi.']);
            }

            return;
        }

        if (! Storage::disk('local')->exists($athlete->school_document_path)) {
            throw ValidationException::withMessages(['school_document' => 'Berkas sekolah yang tercatat tidak ditemukan. Unggah kembali dokumen tersebut.']);
        }
    }

    public function validateRegistration(Registration $registration): void
    {
        $event = $registration->event;
        if (! $this->enabled($event)) {
            return;
        }
        $athletes = $registration->contingent->athletes()->with(['matchCategoryEntries' => fn ($query) => $query
            ->where('event_id', $event->id)->with('matchCategory')])->lockForUpdate()->get();
        if ($athletes->isEmpty()) {
            throw ValidationException::withMessages(['eligibility' => 'Tambahkan atlet dan lengkapi verifikasi persyaratan terlebih dahulu.']);
        }
        foreach ($athletes as $athlete) {
            try {
                $this->validateProfile($event, $athlete);
                foreach ($athlete->matchCategoryEntries as $entry) {
                    $this->validateCategory($event, $athlete, $entry->matchCategory);
                }
                $this->validateSchoolDocument($event, $athlete);
                if (($event->participant_rules['require_school_verification'] ?? false)
                    && ! $this->schoolVerified($event, $athlete)) {
                    throw ValidationException::withMessages(['school_verification' => 'Data sekolah dan kelas belum diverifikasi panitia untuk data serta persyaratan terbaru.']);
                }
            } catch (ValidationException $exception) {
                throw ValidationException::withMessages(['eligibility' => $athlete->name.': '.collect($exception->errors())->flatten()->implode(' ')]);
            }
        }
    }

    /** @return list<string> */
    public function summary(Event $event): array
    {
        if (! $this->enabled($event)) {
            return [];
        }
        $rules = $event->participant_rules;
        $lines = [
            'Maksimal usia '.$rules['max_age_years'].' tahun pada '.CarbonImmutable::parse($rules['age_reference_date'])->translatedFormat('d F Y').'.',
            'Pelajar aktif maksimal kelas '.$this->gradeLabel((int) $rules['max_school_grade']).' pada tahun ajaran '.$rules['academic_year_start'].'/'.($rules['academic_year_start'] + 1).'.',
            'Embu: minimal usia '.$this->ageLabel((int) $rules['embu_min_age_months']).(! empty($rules['embu_min_school_grade']) ? ' atau minimal kelas '.$this->gradeLabel((int) $rules['embu_min_school_grade']).($rules['embu_min_school_grade'] <= 9 ? ' SMP/sederajat' : ' SMA/sederajat') : '').'.',
            'Randori: minimal usia '.$this->ageLabel((int) $rules['randori_min_age_months']).'.',
        ];
        if (! empty($rules['birth_date_from'])) {
            $lines[] = 'Lahir pada atau setelah '.CarbonImmutable::parse($rules['birth_date_from'])->translatedFormat('d F Y').'.';
        }
        $lines[] = ($rules['require_school_document'] ?? false)
            ? 'Surat keterangan sekolah aktif / rapor yang mencantumkan kelas dan tahun masuk wajib diunggah.'
            : 'Surat keterangan sekolah aktif / rapor bersifat opsional; data sekolah dapat diverifikasi tanpa unggahan dokumen.';
        if ($rules['require_school_verification'] ?? false) {
            $lines[] = 'Data sekolah dan kelas wajib diverifikasi admin atau penanggung jawab event sebelum registrasi disetujui.';
        }

        return $lines;
    }

    private function ageLabel(int $months): string
    {
        return intdiv($months, 12).' tahun'.($months % 12 ? ' '.($months % 12).' bulan' : '');
    }

    private function gradeLabel(int $grade): string
    {
        return [7 => 'VII', 8 => 'VIII', 9 => 'IX', 10 => 'X', 11 => 'XI', 12 => 'XII', 13 => 'XIII'][$grade] ?? (string) $grade;
    }
}
