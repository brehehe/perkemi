<?php

namespace App\Http\Requests\Admin\Registration;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreRegistrationPaymentRequest extends FormRequest
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
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        $isPaid = (bool) ($this->route('registration')?->event?->is_paid ?? true);

        return [
            'payment_method_id' => [Rule::requiredIf($isPaid), 'nullable', 'uuid', Rule::exists('payment_methods', 'id')],
            'payment_amount' => [Rule::requiredIf($isPaid), 'nullable', 'numeric', 'min:0'],
            'payment_reference' => ['nullable', 'string', 'max:100'],
            'payment_proof' => ['nullable', 'file', 'mimes:jpg,jpeg,png,pdf', 'max:5120'],
            'payment_note' => ['nullable', 'string', 'max:1000'],
        ];
    }
}
