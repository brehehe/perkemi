<?php

namespace App\Http\Requests\Admin\Panitera;

use App\Models\RandoriScore;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class UpdateRandoriScoreDraftRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $rules = [
            'event_id' => ['required', 'uuid'],
            'client_id' => ['required', 'string', 'max:100'],
            'changes' => ['required', 'array:aka,shiro,signatures,signature_names,notes', 'min:1'],
            'changes.aka' => ['sometimes', 'array:mujoken,ippon,waza_ari,yusei,batsu_5,batsu_10', 'min:1'],
            'changes.shiro' => ['sometimes', 'array:mujoken,ippon,waza_ari,yusei,batsu_5,batsu_10', 'min:1'],
            'changes.signatures' => ['sometimes', 'array:'.implode(',', RandoriScore::SignatureKeys), 'min:1'],
            'changes.signature_names' => ['sometimes', 'array:'.implode(',', RandoriScore::SignatureKeys), 'min:1'],
            'changes.notes' => ['sometimes', 'nullable', 'string', 'max:1000'],
        ];

        foreach (['aka', 'shiro'] as $corner) {
            foreach (['mujoken', 'ippon', 'waza_ari', 'yusei', 'batsu_5', 'batsu_10'] as $scoreKey) {
                $rules["changes.{$corner}.{$scoreKey}"] = ['sometimes', 'integer', 'between:0,20'];
            }
        }

        foreach (RandoriScore::SignatureKeys as $signatureKey) {
            $rules["changes.signatures.{$signatureKey}"] = [
                'sometimes',
                'nullable',
                'string',
                'max:500000',
                'regex:/^data:image\/png;base64,[A-Za-z0-9+\/=]+$/',
            ];
            $rules["changes.signature_names.{$signatureKey}"] = ['sometimes', 'nullable', 'string', 'max:120'];
        }

        return $rules;
    }
}
