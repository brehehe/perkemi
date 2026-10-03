import { useEffect, useId, useMemo, useRef, useState } from 'react';
import FloatingDropdown from './FloatingDropdown';
import FormLabel from './FormLabel';

export default function Combobox({
    label = null,
    error = null,
    hint = null,
    required = false,
    options = [],
    value = '',
    onChange,
    onCreate,
    createLabel = 'Buat pilihan baru',
    placeholder = 'Pilih atau cari...',
    searchPlaceholder = 'Cari opsi...',
    emptyMessage = 'Tidak ada pilihan yang cocok.',
    className = '',
    containerClassName = 'w-full',
    labelClassName = '',
    disabled = false,
    clearable = true,
    size = 'md',
    id,
    ariaLabel,
}) {
    const generatedId = useId();
    const inputId = id || `combobox-${generatedId.replace(/:/g, '')}`;
    const listboxId = `${inputId}-options`;
    const hintId = `${inputId}-hint`;
    const errorId = `${inputId}-error`;
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [activeIndex, setActiveIndex] = useState(0);
    const dropdownRef = useRef(null);
    const triggerRef = useRef(null);
    const searchInputRef = useRef(null);
    const popupRef = useRef(null);

    const normalizedOptions = useMemo(() => options.map((option) => {
        if (typeof option === 'object' && option !== null) {
            return {
                value: option.value,
                label: option.label || option.name || String(option.value),
                sublabel: option.sublabel || option.description || null,
                icon: option.icon || null,
            };
        }

        return { value: option, label: String(option), sublabel: null, icon: null };
    }), [options]);

    const selectedOption = normalizedOptions.find(
        (option) => String(option.value) === String(value),
    );

    const filteredOptions = useMemo(() => {
        const query = search.trim().toLocaleLowerCase('id-ID');

        if (!query) {
            return normalizedOptions;
        }

        return normalizedOptions.filter((option) => (
            option.label.toLocaleLowerCase('id-ID').includes(query)
            || option.sublabel?.toLocaleLowerCase('id-ID').includes(query)
        ));
    }, [normalizedOptions, search]);

    const newLabel = search.trim();
    const canCreate = Boolean(
        onCreate
        && newLabel
        && !normalizedOptions.some(
            (option) => option.label.toLocaleLowerCase('id-ID') === newLabel.toLocaleLowerCase('id-ID'),
        ),
    );
    const selectableCount = filteredOptions.length + (canCreate ? 1 : 0);

    useEffect(() => {
        const closeDropdown = (event) => {
            if (!dropdownRef.current?.contains(event.target) && !popupRef.current?.contains(event.target)) {
                setIsOpen(false);
                setSearch('');
            }
        };

        document.addEventListener('pointerdown', closeDropdown);

        return () => document.removeEventListener('pointerdown', closeDropdown);
    }, []);

    useEffect(() => {
        if (!isOpen) {
            return undefined;
        }

        const frame = requestAnimationFrame(() => searchInputRef.current?.focus());

        return () => cancelAnimationFrame(frame);
    }, [isOpen]);

    useEffect(() => {
        setActiveIndex((currentIndex) => Math.min(currentIndex, Math.max(selectableCount - 1, 0)));
    }, [selectableCount]);

    const closeDropdown = () => {
        setIsOpen(false);
        setSearch('');
        setActiveIndex(0);
    };

    const handleSelect = (option) => {
        onChange?.(option.value);
        closeDropdown();
        requestAnimationFrame(() => triggerRef.current?.focus());
    };

    const handleCreate = () => {
        if (!canCreate) {
            return;
        }

        onCreate(newLabel);
        closeDropdown();
        requestAnimationFrame(() => triggerRef.current?.focus());
    };

    const handleSearchKeyDown = (event) => {
        if (event.key === 'Escape') {
            event.preventDefault();
            closeDropdown();
            triggerRef.current?.focus();
            return;
        }

        if (event.key === 'ArrowDown') {
            event.preventDefault();
            setActiveIndex((currentIndex) => Math.min(currentIndex + 1, Math.max(selectableCount - 1, 0)));
            return;
        }

        if (event.key === 'ArrowUp') {
            event.preventDefault();
            setActiveIndex((currentIndex) => Math.max(currentIndex - 1, 0));
            return;
        }

        if (event.key !== 'Enter') {
            return;
        }

        event.preventDefault();

        if (filteredOptions[activeIndex]) {
            handleSelect(filteredOptions[activeIndex]);
        } else if (canCreate) {
            handleCreate();
        }
    };

    const describedBy = error ? errorId : hint ? hintId : undefined;
    const heightClass = size === 'sm' ? 'min-h-9 px-3 text-xs' : 'min-h-11 px-3.5 text-sm';

    return (
        <div ref={dropdownRef} className={`${containerClassName} space-y-1.5`}>
            {label && (
                <FormLabel
                    id={`${inputId}-label`}
                    htmlFor={inputId}
                    required={required}
                    className={labelClassName}
                >
                    {label}
                </FormLabel>
            )}

            <div className="relative rounded-xl shadow-xs">
                <button
                    ref={triggerRef}
                    id={inputId}
                    type="button"
                    aria-haspopup="listbox"
                    aria-expanded={isOpen}
                    aria-controls={listboxId}
                    aria-labelledby={label ? `${inputId}-label` : undefined}
                    aria-label={!label ? ariaLabel || placeholder : undefined}
                    aria-describedby={describedBy}
                    aria-invalid={Boolean(error)}
                    disabled={disabled}
                    onClick={() => {
                        setIsOpen((open) => !open);
                        setActiveIndex(0);
                    }}
                    className={`flex w-full items-center justify-between gap-2 rounded-xl border bg-white text-left text-slate-900 outline-none transition-all duration-150 dark:bg-slate-900 dark:text-white ${heightClass} ${
                        error
                            ? 'border-rose-300 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 dark:border-rose-700'
                            : isOpen
                                ? 'border-[#c0392b] ring-2 ring-[#c0392b]/20'
                                : 'border-slate-200 hover:border-slate-300 focus-visible:border-[#c0392b] focus-visible:ring-2 focus-visible:ring-[#c0392b]/20 dark:border-slate-800 dark:hover:border-slate-700'
                    } disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400 dark:disabled:bg-slate-800/40 ${clearable && value !== '' && value !== null && value !== undefined ? 'pr-16' : 'pr-10'} ${className}`}
                >
                    <span className="flex min-w-0 flex-1 items-center gap-2">
                        {selectedOption?.icon && <span className="shrink-0">{selectedOption.icon}</span>}
                        <span className={`truncate ${selectedOption ? 'font-medium' : 'text-slate-400 dark:text-slate-500'}`}>
                            {selectedOption ? selectedOption.label : placeholder}
                        </span>
                    </span>
                </button>

                {clearable && value !== '' && value !== null && value !== undefined && !disabled && (
                    <button
                        type="button"
                        aria-label={`Hapus pilihan ${label || ''}`.trim()}
                        onClick={() => {
                            onChange?.('');
                            setSearch('');
                        }}
                        className="absolute right-8 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-2 focus-visible:outline-[#c0392b] dark:hover:bg-slate-800 dark:hover:text-slate-200"
                    >
                        <i className="fa-solid fa-xmark text-xs" aria-hidden="true" />
                    </button>
                )}

                <i
                    className={`fa-solid fa-chevron-down pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                    aria-hidden="true"
                />

                <FloatingDropdown
                    open={isOpen}
                    anchorRef={triggerRef}
                    popupRef={popupRef}
                    id={listboxId}
                    role="listbox"
                    maxHeight={320}
                    className="rounded-xl border border-slate-200 bg-white py-1.5 shadow-xl dark:border-slate-800 dark:bg-slate-900"
                >
                    <div className="border-b border-slate-100 p-2 dark:border-slate-800">
                        <div className="relative">
                            <i className="fa-solid fa-magnifying-glass pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400" aria-hidden="true" />
                            <input
                                ref={searchInputRef}
                                type="search"
                                role="combobox"
                                aria-label={`Cari ${label || 'pilihan'}`}
                                aria-expanded={isOpen}
                                aria-controls={listboxId}
                                aria-autocomplete="list"
                                aria-activedescendant={filteredOptions[activeIndex]
                                    ? `${listboxId}-${activeIndex}`
                                    : canCreate && activeIndex === filteredOptions.length ? `${listboxId}-create` : undefined}
                                value={search}
                                onChange={(event) => {
                                    setSearch(event.target.value);
                                    setActiveIndex(0);
                                }}
                                onKeyDown={handleSearchKeyDown}
                                placeholder={searchPlaceholder}
                                className="min-h-9 w-full rounded-lg border-0 bg-slate-50 py-2 pl-9 pr-3 text-xs text-slate-900 outline-none focus:ring-2 focus:ring-[#c0392b]/20 dark:bg-slate-800 dark:text-white"
                            />
                        </div>
                    </div>

                    <div className="max-h-60 overflow-y-auto p-1">
                        {filteredOptions.map((option, index) => {
                            const isSelected = String(option.value) === String(value);

                            return (
                                <button
                                    key={String(option.value)}
                                    id={`${listboxId}-${index}`}
                                    type="button"
                                    role="option"
                                    aria-selected={isSelected}
                                    onMouseEnter={() => setActiveIndex(index)}
                                    onMouseDown={(event) => event.preventDefault()}
                                    onClick={() => handleSelect(option)}
                                    className={`flex min-h-10 w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-xs transition-colors ${
                                        activeIndex === index
                                            ? 'bg-[#f9eee9] text-[#9c2d20] dark:bg-[#c0392b]/20 dark:text-rose-300'
                                            : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                                    }`}
                                >
                                    <span className="flex min-w-0 items-center gap-2">
                                        {option.icon && <span className="shrink-0">{option.icon}</span>}
                                        <span className="min-w-0">
                                            <span className="block truncate font-medium">{option.label}</span>
                                            {option.sublabel && <span className="block truncate text-[10px] text-slate-400 dark:text-slate-500">{option.sublabel}</span>}
                                        </span>
                                    </span>
                                    {isSelected && <i className="fa-solid fa-check shrink-0 text-[#c0392b]" aria-hidden="true" />}
                                </button>
                            );
                        })}

                        {!filteredOptions.length && !canCreate && (
                            <p className="px-3 py-4 text-center text-xs text-slate-500 dark:text-slate-400">{emptyMessage}</p>
                        )}

                        {canCreate && (
                            <button
                                id={`${listboxId}-create`}
                                type="button"
                                role="option"
                                aria-selected="false"
                                onMouseEnter={() => setActiveIndex(filteredOptions.length)}
                                onMouseDown={(event) => event.preventDefault()}
                                onClick={handleCreate}
                                className={`mt-1 flex min-h-10 w-full items-center gap-2 rounded-lg border-t border-slate-100 px-3 py-2 text-left text-xs font-semibold text-[#a93226] dark:border-slate-800 dark:text-rose-300 ${activeIndex === filteredOptions.length ? 'bg-[#f9eee9] dark:bg-[#c0392b]/20' : 'hover:bg-[#f9eee9] dark:hover:bg-[#c0392b]/20'}`}
                            >
                                <i className="fa-solid fa-plus" aria-hidden="true" />
                                <span>{createLabel} “{newLabel}”</span>
                            </button>
                        )}
                    </div>
                </FloatingDropdown>
            </div>

            {error ? (
                <p id={errorId} role="alert" className="text-xs font-medium text-rose-600">{error}</p>
            ) : hint ? (
                <p id={hintId} className="text-xs text-slate-500 dark:text-slate-400">{hint}</p>
            ) : null}
        </div>
    );
}
