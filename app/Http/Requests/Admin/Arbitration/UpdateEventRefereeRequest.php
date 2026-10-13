<?php

namespace App\Http\Requests\Admin\Arbitration;

use App\Models\Referee;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateEventRefereeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, array<int, mixed>> */
    public function rules(): array
    {
        $referee = $this->route('referee');

        return [
            'name' => ['required', 'string', 'max:150'],
            'gender' => ['required', 'in:male,female'],
            'dan_grade' => ['nullable', 'string', 'max:50'],
            'license_number' => [
                'nullable',
                'string',
                'max:100',
                Rule::unique('referees', 'license_number')->ignore($referee instanceof Referee ? $referee->id : $referee),
            ],
            'certification_level' => ['nullable', 'string', 'max:100'],
            'region' => ['nullable', 'string', 'max:100'],
            'phone' => ['nullable', 'string', 'max:50'],
            'email' => ['nullable', 'email', 'max:150'],
            'profile_photo' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:2048'],
            'notes' => ['nullable', 'string', 'max:500'],
            'is_active' => ['required', 'boolean'],
            'role' => ['required', 'in:chief,referee,judge,reserve'],
        ];
    }
}
