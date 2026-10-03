<?php

namespace App\Http\Requests\Admin\Registration;

use Illuminate\Foundation\Http\FormRequest;

class StoreAthleteMatchCategoryEntryRequest extends FormRequest
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
     * @return array<string, array<int, string>>
     */
    public function rules(): array
    {
        return [
            'event_match_category_id' => ['required', 'uuid'],
            'team_number' => ['sometimes', 'integer', 'min:1', 'max:20'],
        ];
    }
}
