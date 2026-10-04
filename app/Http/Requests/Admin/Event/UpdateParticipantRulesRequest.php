<?php

namespace App\Http\Requests\Admin\Event;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class UpdateParticipantRulesRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('update', $this->route('event')) ?? false;
    }

    /** @return array<string, list<string>> */
    public function rules(): array
    {
        return [
            'enabled' => ['required', 'boolean'],
            'age_reference_date' => ['required', 'date_format:Y-m-d'],
            'academic_year_start' => ['required', 'integer', 'between:2000,2100'],
            'max_age_years' => ['required', 'integer', 'between:1,99'],
            'birth_date_from' => ['nullable', 'date_format:Y-m-d', 'before_or_equal:age_reference_date'],
            'max_school_grade' => ['required', 'integer', 'between:7,13'],
            'embu_min_age_months' => ['required', 'integer', 'between:0,1188'],
            'embu_min_school_grade' => ['nullable', 'integer', 'between:7,13', 'lte:max_school_grade'],
            'randori_min_age_months' => ['required', 'integer', 'between:0,1188'],
            'require_school_verification' => ['required', 'boolean'],
            'require_school_document' => ['required', 'boolean'],
        ];
    }

    /** @return array<string, mixed> */
    public function rulesData(): array
    {
        $data = $this->validated();
        foreach (['academic_year_start', 'max_age_years', 'max_school_grade', 'embu_min_age_months', 'embu_min_school_grade', 'randori_min_age_months'] as $key) {
            $data[$key] = isset($data[$key]) ? (int) $data[$key] : null;
        }
        $data['enabled'] = $this->boolean('enabled');
        $data['require_school_verification'] = $this->boolean('require_school_verification');
        $data['require_school_document'] = $this->boolean('require_school_document');

        return $data;
    }

    /** @return list<\Closure> */
    public function after(): array
    {
        return [function (Validator $validator): void {
            if ($validator->errors()->isNotEmpty()) {
                return;
            }
            foreach (['embu_min_age_months', 'randori_min_age_months'] as $key) {
                if ($this->integer($key) >= ($this->integer('max_age_years') + 1) * 12) {
                    $validator->errors()->add($key, 'Usia minimum tidak boleh melampaui usia maksimal event.');
                }
            }
        }];
    }
}
