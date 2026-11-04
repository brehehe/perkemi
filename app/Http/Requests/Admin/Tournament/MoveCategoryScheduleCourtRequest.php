<?php

namespace App\Http\Requests\Admin\Tournament;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class MoveCategoryScheduleCourtRequest extends FormRequest
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
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'event_court_id' => ['required', 'uuid'],
            'target_rundown_id' => ['nullable', 'uuid'],
            'target_start_time' => ['nullable', 'date_format:H:i'],
            'placement_mode' => ['nullable', 'in:auto,append,earliest,at_slot'],
        ];
    }

    /**
     * Get the validation messages for the request.
     *
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'event_court_id.required' => 'Pilih court / gelanggang tujuan pertandingan.',
            'event_court_id.uuid' => 'Court tujuan tidak valid.',
            'target_rundown_id.uuid' => 'Sesi pertandingan tidak valid.',
            'target_start_time.date_format' => 'Jam mulai harus menggunakan format jam dan menit (HH:MM).',
            'placement_mode.in' => 'Mode penempatan jadwal tidak valid.',
        ];
    }
}
