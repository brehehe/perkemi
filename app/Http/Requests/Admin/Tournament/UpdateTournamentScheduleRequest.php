<?php

namespace App\Http\Requests\Admin\Tournament;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class UpdateTournamentScheduleRequest extends FormRequest
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
            'rundown_id' => ['required', 'uuid'],
            'start_time' => ['required', 'date_format:H:i'],
            'swap_with_match_id' => ['nullable', 'uuid'],
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
            'event_court_id.required' => 'Pilih court tujuan pertandingan.',
            'event_court_id.uuid' => 'Court tujuan tidak valid.',
            'rundown_id.required' => 'Pilih sesi pertandingan.',
            'rundown_id.uuid' => 'Sesi pertandingan tidak valid.',
            'start_time.required' => 'Pilih jam mulai pertandingan.',
            'start_time.date_format' => 'Jam mulai harus menggunakan format jam dan menit.',
            'swap_with_match_id.uuid' => 'Partai tujuan pertukaran tidak valid.',
        ];
    }
}
