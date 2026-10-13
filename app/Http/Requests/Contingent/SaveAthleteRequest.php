<?php

namespace App\Http\Requests\Contingent;

use App\Services\ParticipantEligibilityService;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class SaveAthleteRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()?->hasRole('kontingen') ?? false;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(ParticipantEligibilityService $eligibility): array
    {
        return [
            ...$eligibility->schoolInputRules(),
            'name' => ['required', 'string', 'max:255'],
            'nik' => ['nullable', 'digits:16'],
            'kenshi_number' => ['nullable', 'string', 'max:50'],
            'gender' => ['required', Rule::in(['male', 'female', 'putra', 'putri', 'L', 'P'])],
            'birth_place' => ['nullable', 'string', 'max:255'],
            'birth_date' => ['nullable', 'date', 'before:today'],
            'blood_type' => ['nullable', Rule::in(['A', 'B', 'AB', 'O'])],
            'home_address' => ['nullable', 'string', 'max:2000'],
            'dojo_name' => ['nullable', 'string', 'max:255'],
            'kyu_dan' => ['required', 'string', 'max:50'],
            'weight' => ['nullable', 'numeric', 'min:20', 'max:200'],
            'height' => ['nullable', 'numeric', 'min:80', 'max:250'],
            'bpjs_number' => ['nullable', 'string', 'max:40'],
            'bpjs_status' => ['nullable', Rule::in(['active', 'inactive', 'none'])],
            'profile_photo' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:2048'],
        ];
    }
}
