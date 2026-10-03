<?php

namespace App\Http\Requests\Admin\Event;

use App\Models\SiteSetting;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateHomepageSettingsRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()?->hasAnyRole(['Super Admin', 'Admin']) ?? false;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'home_landing_mode' => [
                'required',
                Rule::in([
                    SiteSetting::HomeDefault,
                    SiteSetting::HomeFeaturedEvent,
                    SiteSetting::HomeUpcomingEvent,
                ]),
            ],
            'featured_event_id' => [
                Rule::requiredIf($this->input('home_landing_mode') === SiteSetting::HomeFeaturedEvent),
                'nullable',
                'uuid',
                'exists:events,id',
            ],
        ];
    }
}
