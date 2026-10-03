<?php

namespace App\Http\Requests\Admin\Master;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class StoreWeightClassRequest extends FormRequest
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
            'name' => ['required', 'string', 'max:100', 'unique:weight_classes,name'],
            'gender' => ['required', 'in:male,female,mixed'],
            'min_weight' => ['nullable', 'numeric', 'min:0', 'max:300'],
            'max_weight' => ['nullable', 'numeric', 'min:0', 'max:300'],
            'order' => ['required', 'integer', 'min:0', 'max:1000'],
            'is_active' => ['boolean'],
            'description' => ['nullable', 'string', 'max:500'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            $minimumWeight = $this->input('min_weight');
            $maximumWeight = $this->input('max_weight');

            if ($minimumWeight !== null && $minimumWeight !== '' && $maximumWeight !== null && $maximumWeight !== '' && (float) $minimumWeight > (float) $maximumWeight) {
                $validator->errors()->add('max_weight', 'Berat maksimal harus lebih besar atau sama dengan berat minimal.');
            }
        });
    }
}
