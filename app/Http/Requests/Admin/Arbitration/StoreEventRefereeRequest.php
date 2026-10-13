<?php

namespace App\Http\Requests\Admin\Arbitration;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreEventRefereeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'source' => $this->input('source', 'new'),
        ]);
    }

    /** @return array<string, array<int, mixed>> */
    public function rules(): array
    {
        return [
            'source' => ['required', 'in:existing,new'],
            'referee_id' => [
                'nullable',
                'required_if:source,existing',
                'uuid',
                Rule::exists('referees', 'id')->whereNull('deleted_at'),
            ],
            'name' => ['nullable', 'required_if:source,new', 'string', 'max:150'],
            'gender' => ['nullable', 'required_if:source,new', 'in:male,female'],
            'dan_grade' => ['nullable', 'string', 'max:50'],
            'license_number' => [
                'nullable',
                'string',
                'max:100',
                Rule::when($this->input('source') === 'new', Rule::unique('referees', 'license_number')),
            ],
            'certification_level' => ['nullable', 'string', 'max:100'],
            'region' => ['nullable', 'string', 'max:100'],
            'phone' => ['nullable', 'string', 'max:50'],
            'email' => ['nullable', 'email', 'max:150'],
            'profile_photo' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:2048'],
            'notes' => ['nullable', 'string', 'max:500'],
            'is_active' => ['nullable', 'required_if:source,new', 'boolean'],
            'role' => ['required', 'in:chief,referee,judge,reserve'],
        ];
    }
}
