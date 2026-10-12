<?php

namespace App\Http\Requests\Admin\Tournament;

use App\Enums\RefereeCourtRole;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateRefereeCourtPanelRequest extends FormRequest
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
        $rules = [
            'referees' => ['required', 'array', 'size:5'],
            'referees.*' => ['required', 'uuid', 'distinct'],
        ];

        foreach (RefereeCourtRole::cases() as $role) {
            $rules["referees.{$role->value}"] = [
                'required',
                'uuid',
                'distinct',
                Rule::exists('referees', 'id')
                    ->whereNull('deleted_at')
                    ->where('is_active', true),
            ];
        }

        return $rules;
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'referees.required' => 'Lima posisi wasit wajib diisi.',
            'referees.size' => 'Panel court wajib terdiri dari tepat lima posisi wasit.',
            'referees.*.required' => 'Setiap posisi wasit wajib dipilih.',
            'referees.*.distinct' => 'Satu wasit tidak boleh mengisi lebih dari satu posisi pada court yang sama.',
            'referees.*.exists' => 'Wasit yang dipilih tidak ditemukan atau sudah tidak aktif di master data.',
        ];
    }
}
