<?php

namespace App\Http\Requests\Admin\Arbitration;

use Illuminate\Foundation\Http\FormRequest;

class StoreEventCourtAssignmentRequest extends FormRequest
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
            'staff_type' => ['required', 'in:referee,clerk,field_coordinator'],
            'staff_id' => ['required', 'uuid'],
            'role' => ['required', 'string', 'max:50'],
        ];
    }
}
