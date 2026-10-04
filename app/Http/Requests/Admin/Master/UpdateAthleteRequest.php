<?php

namespace App\Http\Requests\Admin\Master;

use App\Models\Contingent;
use App\Models\Event;
use App\Services\ParticipantEligibilityService;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class UpdateAthleteRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        $tenantEvent = $this->attributes->get('tenantEvent');
        if ($tenantEvent instanceof Event) {
            $athlete = $this->route('athlete');
            abort_unless($athlete?->contingent()->whereBelongsTo($tenantEvent)->exists(), 404);
            if ($this->input('contingent_id')) {
                abort_unless(Contingent::query()
                    ->whereKey($this->input('contingent_id'))
                    ->whereBelongsTo($tenantEvent)
                    ->exists(), 404);
            }
        }

        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(ParticipantEligibilityService $eligibility): array
    {
        return [
            ...$eligibility->schoolInputRules(),
            'contingent_id' => ['required', 'uuid', 'exists:contingents,id'],
            'name' => ['required', 'string', 'max:255'],
            'nik' => ['nullable', 'digits:16'],
            'kenshi_number' => ['nullable', 'string', 'max:50'],
            'gender' => ['required', 'string', 'in:male,female,putra,putri'],
            'birth_place' => ['nullable', 'string', 'max:255'],
            'blood_type' => ['nullable', 'in:A,B,AB,O'],
            'home_address' => ['nullable', 'string', 'max:2000'],
            'dojo_name' => ['nullable', 'string', 'max:255'],
            'kyu_dan' => ['required', 'string', 'max:50'],
            'weight' => ['nullable', 'numeric', 'min:20', 'max:200'],
            'height' => ['nullable', 'numeric', 'min:80', 'max:250'],
            'birth_date' => ['nullable', 'date', 'before:today'],
        ];
    }
}
