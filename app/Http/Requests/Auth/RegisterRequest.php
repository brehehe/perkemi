<?php

namespace App\Http\Requests\Auth;

use App\Models\User;
use App\Support\PhoneNumber;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class RegisterRequest extends FormRequest
{
    protected function prepareForValidation(): void
    {
        $this->merge(['phone' => PhoneNumber::normalize($this->input('phone'))]);
    }

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
            'email' => ['required', 'string', 'lowercase', 'email', 'max:255', 'unique:'.User::class],
            'nik_perkemi' => ['nullable', 'string', 'max:30', Rule::unique('users', 'nik_perkemi')],
            'contingent_name' => ['required', 'string', 'max:255'],
            'city' => ['required', 'string', 'max:255'],
            'manager_name' => ['required', 'string', 'max:255'],
            'phone' => ['required', 'string', 'max:30', Rule::unique('users', 'phone')],
            'address' => ['required', 'string', 'max:1000'],
        ];
    }

    /**
     * Get custom attributes for validator errors.
     *
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            'name' => 'nama lengkap',
            'email' => 'alamat email',
            'nik_perkemi' => 'NIK PERKEMI',
            'contingent_name' => 'nama kontingen',
            'city' => 'kabupaten / kota',
            'manager_name' => 'nama manager',
            'phone' => 'nomor HP / WhatsApp',
            'address' => 'alamat',
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'nik_perkemi.unique' => 'NIK PERKEMI sudah terdaftar dalam sistem.',
            'email.unique' => 'Alamat email sudah terdaftar dalam sistem.',
            'phone.unique' => 'Nomor HP / WhatsApp sudah terdaftar dalam sistem.',
        ];
    }
}
