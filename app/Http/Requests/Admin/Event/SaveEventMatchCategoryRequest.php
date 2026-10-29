<?php

namespace App\Http\Requests\Admin\Event;

use App\Models\Event;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class SaveEventMatchCategoryRequest extends FormRequest
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
        /** @var Event|null $event */
        $event = $this->route('event');
        $eventId = $event?->id;

        return [
            'name' => ['required', 'string', 'max:150'],
            'age_category_id' => [
                'nullable',
                'uuid',
                $eventId
                    ? Rule::exists('event_age_categories', 'id')->where('event_id', $eventId)
                    : 'exists:event_age_categories,id',
            ],
            'weight_class_id' => ['nullable', 'uuid', 'exists:weight_classes,id'],
            'type' => ['required', 'in:embu,randori'],
            'gender' => ['required', 'in:male,female,mixed'],
            'capacity' => ['required', 'integer', 'min:1', 'max:256'],
            'max_athletes_per_team' => ['nullable', 'integer', 'min:1', 'max:20'],
            'min_weight' => ['nullable', 'numeric', 'min:0'],
            'max_weight' => ['nullable', 'numeric', 'min:0'],
            'min_kyu' => ['nullable', 'string', 'max:50'],
            'max_kyu' => ['nullable', 'string', 'max:50'],
            'order' => ['nullable', 'integer'],
            'is_active' => ['boolean'],
            'is_exhibition' => ['nullable', 'boolean'],
        ];
    }
}
