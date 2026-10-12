<?php

namespace App\Http\Requests\Admin\Panitera;

use App\Models\RandoriScore;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class StoreRandoriScoreRequest extends FormRequest
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
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $rules = [
            'event_id' => ['required', 'uuid'],
            'aka' => ['required', 'array'],
            'shiro' => ['required', 'array'],
            'aka.mujoken' => ['required', 'integer', 'between:0,20'],
            'aka.ippon' => ['required', 'integer', 'between:0,20'],
            'aka.waza_ari' => ['required', 'integer', 'between:0,20'],
            'aka.yusei' => ['required', 'integer', 'between:0,20'],
            'aka.batsu_5' => ['required', 'integer', 'between:0,20'],
            'aka.batsu_10' => ['required', 'integer', 'between:0,20'],
            'shiro.mujoken' => ['required', 'integer', 'between:0,20'],
            'shiro.ippon' => ['required', 'integer', 'between:0,20'],
            'shiro.waza_ari' => ['required', 'integer', 'between:0,20'],
            'shiro.yusei' => ['required', 'integer', 'between:0,20'],
            'shiro.batsu_5' => ['required', 'integer', 'between:0,20'],
            'shiro.batsu_10' => ['required', 'integer', 'between:0,20'],
            'signatures' => ['required', 'array:'.implode(',', RandoriScore::SignatureKeys)],
            'notes' => ['nullable', 'string', 'max:1000'],
            'return_to_match' => ['nullable', 'boolean'],
        ];

        foreach (RandoriScore::SignatureKeys as $signatureKey) {
            $rules["signatures.{$signatureKey}"] = [
                'required',
                'string',
                'max:500000',
                'regex:/^data:image\/png;base64,[A-Za-z0-9+\/=]+$/',
            ];
        }

        return $rules;
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'signatures.*.required' => 'Tanda tangan :attribute wajib diisi.',
            'signatures.*.string' => 'Tanda tangan :attribute tidak valid.',
            'signatures.*.regex' => 'Format tanda tangan :attribute tidak valid.',
            'signatures.*.max' => 'Ukuran tanda tangan :attribute terlalu besar.',
        ];
    }

    /** @return array<string, string> */
    public function attributes(): array
    {
        return [
            'signatures.arbitrase' => 'Arbitrase',
            'signatures.field_coordinator' => 'Koordinator Lapangan',
            'signatures.referee' => 'Wasit Lapangan',
            'signatures.clerk' => 'Panitera',
            'signatures.red_manager' => 'Manajer Kontingen Merah',
            'signatures.white_manager' => 'Manajer Kontingen Putih',
        ];
    }
}
