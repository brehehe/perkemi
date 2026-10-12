<?php

namespace App\Http\Requests\Admin\Tournament;

use Illuminate\Foundation\Http\FormRequest;

class UpdateRefereeAttendanceRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, array<int, string>|string>
     */
    public function rules(): array
    {
        return [
            'event_id' => ['required', 'uuid', 'exists:events,id'],
            'attendance_date' => ['required', 'date_format:Y-m-d'],
            'is_present' => ['required', 'boolean'],
            'notes' => ['nullable', 'string', 'max:500'],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'attendance_date.required' => 'Tanggal absensi wajib dipilih.',
            'attendance_date.date_format' => 'Format tanggal absensi tidak valid.',
            'is_present.required' => 'Status kehadiran wajib dipilih.',
            'is_present.boolean' => 'Status kehadiran tidak valid.',
            'notes.max' => 'Catatan maksimal 500 karakter.',
        ];
    }
}
