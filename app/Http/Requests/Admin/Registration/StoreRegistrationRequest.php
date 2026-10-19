<?php

namespace App\Http\Requests\Admin\Registration;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class StoreRegistrationRequest extends FormRequest
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
            'event_id' => ['required', 'uuid', 'exists:events,id'],
            'contingent_id' => ['nullable', 'uuid', 'exists:contingents,id'],
            'name' => ['required_without:contingent_id', 'nullable', 'string', 'max:255'],
            'city' => ['required_without:contingent_id', 'nullable', 'string', 'max:100'],
            'manager_name' => ['required_without:contingent_id', 'nullable', 'string', 'max:255'],
            'phone' => ['required_without:contingent_id', 'nullable', 'string', 'max:50'],
            'email' => ['required_without:contingent_id', 'nullable', 'email', 'max:255'],
            'address' => ['required_without:contingent_id', 'nullable', 'string', 'max:2000'],
            'notes' => ['nullable', 'string', 'max:2000'],
        ];
    }
}
