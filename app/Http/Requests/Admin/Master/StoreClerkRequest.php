<?php

namespace App\Http\Requests\Admin\Master;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\Password;

class StoreClerkRequest extends FormRequest
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
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:150'],
            'employee_number' => ['nullable', 'string', 'max:100', 'unique:clerks,employee_number'],
            'certification' => ['nullable', 'string', 'max:100'],
            'region' => ['nullable', 'string', 'max:100'],
            'phone' => ['nullable', 'string', 'max:50'],
            'email' => ['nullable', 'required_with:password', 'email', 'max:150'],
            'password' => ['nullable', 'confirmed', Password::defaults()],
            'notes' => ['nullable', 'string', 'max:500'],
            'is_active' => ['boolean'],
        ];
    }
}
