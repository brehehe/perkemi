<?php

namespace App\Http\Requests\Admin\Panitera;

use App\Services\Panitera\PaniteraMatchWorkflow;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdatePaniteraMatchWorkflowRequest extends FormRequest
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
        return [
            'event_id' => ['required', 'uuid'],
            'action' => ['required', 'string', Rule::in(PaniteraMatchWorkflow::Actions)],
            'timer_version' => ['nullable', 'integer', 'min:0'],
            'timer_direction' => ['required_if:action,'.PaniteraMatchWorkflow::ActionConfigureTimer, 'nullable', 'string', Rule::in(['up', 'down'])],
            'timer_duration_seconds' => ['required_if:action,'.PaniteraMatchWorkflow::ActionConfigureTimer, 'nullable', 'integer', 'min:10', 'max:3600'],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'action.in' => 'Aksi alur Panitera tidak dikenal.',
            'timer_direction.required_if' => 'Pilih mode timer maju atau mundur.',
            'timer_direction.in' => 'Mode timer hanya boleh maju atau mundur.',
            'timer_duration_seconds.required_if' => 'Durasi timer wajib diisi.',
            'timer_duration_seconds.min' => 'Durasi timer minimal 10 detik.',
            'timer_duration_seconds.max' => 'Durasi timer maksimal 60 menit.',
        ];
    }
}
