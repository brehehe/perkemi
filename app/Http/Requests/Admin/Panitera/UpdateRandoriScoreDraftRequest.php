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
            'changes' => ['required', 'array:aka,shiro,signatures,signature_names,notes,decision_override', 'min:1'],
            'changes.aka' => ['sometimes', 'array:mujoken,ippon,waza_ari,yusei,batsu_5,batsu_10', 'min:1'],
            'changes.shiro' => ['sometimes', 'array:mujoken,ippon,waza_ari,yusei,batsu_5,batsu_10', 'min:1'],
            'changes.signatures' => ['sometimes', 'array:'.implode(',', RandoriScore::SignatureKeys), 'min:1'],
            'changes.signature_names' => ['sometimes', 'array:'.implode(',', RandoriScore::SignatureKeys), 'min:1'],
            'changes.notes' => ['sometimes', 'nullable', 'string', 'max:1000'],
            'changes.decision_override' => ['sometimes', 'nullable', 'array'],
            'changes.decision_override.type' => ['nullable', 'string', 'in:medical_stop,disqualification'],
            'changes.decision_override.affected_corner' => ['nullable', 'string', 'in:aka,shiro'],
            'changes.decision_override.disqualification_scope' => ['nullable', 'string', 'in:match,global'],
            'changes.decision_override.reason' => ['nullable', 'string', 'max:255'],
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
                function (string $attribute, mixed $value, \Closure $fail): void {
                    if ($value === null || $value === '') {
                        return;
                    }
                    if (! is_string($value) || ! preg_match('/^data:image\/png;base64,[A-Za-z0-9+\/=]+$/', $value)) {
                        $fail("Format tanda tangan {$attribute} tidak valid.");
                    }
                },
            ];
            $rules["changes.signature_names.{$signatureKey}"] = ['sometimes', 'nullable', 'string', 'max:120'];
        }

        return $rules;
    }
}
