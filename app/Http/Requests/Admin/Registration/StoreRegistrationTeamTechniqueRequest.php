<?php

namespace App\Http\Requests\Admin\Registration;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreRegistrationTeamTechniqueRequest extends FormRequest
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
            'technique_id' => [
                'required_without:technique_name',
                'nullable',
                'uuid',
                Rule::exists('techniques', 'id')->where('is_active', true)->whereNull('deleted_at'),
            ],
            'technique_name' => ['required_without:technique_id', 'nullable', 'string', 'max:150'],
        ];
    }
}
