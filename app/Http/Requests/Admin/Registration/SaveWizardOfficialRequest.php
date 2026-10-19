<?php

namespace App\Http\Requests\Admin\Registration;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class SaveWizardOfficialRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'role' => ['required', 'string', 'max:100'],
            'phone' => ['required', 'string', 'max:50'],
            'gender' => ['nullable', Rule::in(['male', 'female', 'putra', 'putri', 'L', 'P'])],
        ];
    }
}
