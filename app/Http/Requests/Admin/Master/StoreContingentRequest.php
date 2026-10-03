<?php

namespace App\Http\Requests\Admin\Master;

use App\Enums\ContingentStatus;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreContingentRequest extends FormRequest
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
            'city' => ['required', 'string', 'max:100'],
            'manager_name' => ['required', 'string', 'max:255'],
            'phone' => ['required', 'string', 'max:50'],
            'address' => ['nullable', 'string'],
            'status' => ['nullable', Rule::enum(ContingentStatus::class)],
            'event_id' => ['nullable', 'uuid', 'exists:events,id'],
            'user_id' => ['nullable', 'uuid', 'exists:users,id'],
        ];
    }
}
