import ParticipantRulesForm from './ParticipantRulesForm';
import TableContainer from '@/Components/UI/DataDisplay/TableContainer';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { useState, useRef, useEffect } from 'react';
import AdminLayout from '@/Layouts/AdminLayout';
import {
    Card,
    Button,
    Checkbox,
    Input,
    RadioGroup,
    Textarea,
    Combobox,
    Modal,
    Badge,
    Pagination,
} from '@/Components/UI';

export default function EventDetail({
    event = {},
    ageCategories = [],
    courts = [],
    matchCategories = [],
    rundowns = [],
    allEvents = [],
    kyus = [],
    weightClasses = [],
    paymentMethods = [],
    referees = [],
    eventReferees = [],
    clerks = [],
    eventClerks = [],
    fieldCoordinators = [],
    eventFieldCoordinators = [],
    users = [],
    eventUsers = [],
    tournamentSummary = {
        status: 'draft',
        generated_categories: 0,
        skipped_categories: 0,
        total_matches: 0,
        match_sessions: 0,
    },
    tenantBaseDomain = 'localhost',
    counts = {
        age_categories: 0,
        courts: 0,
        match_categories: 0,
        rundowns: 0,
    },
    auth = {},
}) {
    // Current active tab
    const [activeTab, setActiveTab] = useState('age_categories'); // 'info' | 'dates' | 'rundown' | 'age_categories' | 'courts' | 'matches' | 'fees'

    // Tab horizontal scroll control
    const tabScrollRef = useRef(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(false);

    const checkTabScroll = () => {
        if (tabScrollRef.current) {
            const { scrollLeft, scrollWidth, clientWidth } = tabScrollRef.current;
            setCanScrollLeft(scrollLeft > 5);
            setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 5);
        }
    };

    useEffect(() => {
        checkTabScroll();
        window.addEventListener('resize', checkTabScroll);
        return () => window.removeEventListener('resize', checkTabScroll);
    }, []);

    const scrollTabs = (direction) => {
        if (tabScrollRef.current) {
            tabScrollRef.current.scrollBy({
                left: direction === 'left' ? -220 : 220,
                behavior: 'smooth',
            });
        }
    };

    const handleTabWheel = (e) => {
        if (tabScrollRef.current) {
            const { scrollLeft, scrollWidth, clientWidth } = tabScrollRef.current;
            const maxScroll = scrollWidth - clientWidth;
            if (maxScroll > 0) {
                if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
                    if ((e.deltaY > 0 && scrollLeft < maxScroll) || (e.deltaY < 0 && scrollLeft > 0)) {
                        tabScrollRef.current.scrollLeft += e.deltaY;
                    }
                }
            }
        }
    };

    // Pagination & Search states (Standard 5 items per page like Dashboard)
    const itemsPerPage = 5;

    const [ageSearch, setAgeSearch] = useState('');
    const [agePage, setAgePage] = useState(1);

    const [courtSearch, setCourtSearch] = useState('');
    const [courtPage, setCourtPage] = useState(1);

    const [matchSearch, setMatchSearch] = useState('');
    const [matchTypeFilter, setMatchTypeFilter] = useState('all');
    const [matchGenderFilter, setMatchGenderFilter] = useState('all');
    const [matchAgeFilter, setMatchAgeFilter] = useState('all');
    const [matchPage, setMatchPage] = useState(1);

    const [rundownSearch, setRundownSearch] = useState('');
    const [rundownPage, setRundownPage] = useState(1);

    const [copiedUrlType, setCopiedUrlType] = useState(null);

    const handleCopyUrl = (url, type) => {
        if (typeof navigator !== 'undefined' && navigator.clipboard) {
            navigator.clipboard.writeText(url);
            setCopiedUrlType(type);
            setTimeout(() => setCopiedUrlType(null), 2000);
        }
    };

    // ══════════════════════════════════════════════════════════════
    // MODAL STATES
    // ══════════════════════════════════════════════════════════════
    // 1. Age Category Modal
    const [isAgeModalOpen, setIsAgeModalOpen] = useState(false);
    const [editingAgeCategory, setEditingAgeCategory] = useState(null);
    const [deletingAgeCategory, setDeletingAgeCategory] = useState(null);

    // 2. Court Modal
    const [isCourtModalOpen, setIsCourtModalOpen] = useState(false);
    const [editingCourt, setEditingCourt] = useState(null);
    const [deletingCourt, setDeletingCourt] = useState(null);

    // 3. Match Category Modal
    const [isMatchModalOpen, setIsMatchModalOpen] = useState(false);
    const [editingMatchCategory, setEditingMatchCategory] = useState(null);
    const [deletingMatchCategory, setDeletingMatchCategory] = useState(null);

    // 4. Rundown Modal
    const [isRundownModalOpen, setIsRundownModalOpen] = useState(false);
    const [editingRundown, setEditingRundown] = useState(null);
    const [deletingRundown, setDeletingRundown] = useState(null);

    // 5. Event Referee Modal
    const [isNewRefereeModalOpen, setIsNewRefereeModalOpen] = useState(false);
    const [isNewClerkModalOpen, setIsNewClerkModalOpen] = useState(false);
    const [isNewFieldCoordinatorModalOpen, setIsNewFieldCoordinatorModalOpen] = useState(false);
    const [selectedEventUserId, setSelectedEventUserId] = useState('');
    const [selectedEventUserRole, setSelectedEventUserRole] = useState('responsible');
    const [generalSaveFeedback, setGeneralSaveFeedback] = useState(null);
    const [accessSaveFeedback, setAccessSaveFeedback] = useState(null);

    // ══════════════════════════════════════════════════════════════
    // INERTIA FORMS
    // ══════════════════════════════════════════════════════════════
    // Form: General Info
    const generalForm = useForm({
        name: event.name || '',
        edition: event.edition || '',
        organizer: event.organizer || '',
        venue: event.venue || '',
        city: event.city || '',
        province: event.province || '',
        description: event.description || '',
        contact_person: event.contact_person || '',
        contact_phone: event.contact_phone || '',
        slug: event.slug || '',
        tenant_subdomain: event.tenant_subdomain || '',
        max_match_categories_per_athlete: event.max_match_categories_per_athlete || 1,
        allow_cross_age_group_embu: Boolean(event.allow_cross_age_group_embu),
        status: event.status || 'open_registration',
        is_active: event.is_active || false,
    });

    // Form: Dates
    const datesForm = useForm({
        start_date: event.start_date || '',
        end_date: event.end_date || '',
        registration_start: event.registration_start || '',
        registration_end: event.registration_end || '',
    });
    const accessForm = useForm({ users: eventUsers });

    // Form: Fees
    const feesForm = useForm({
        is_paid: event.is_paid ?? true,
        fee_per_contingent: event.fee_per_contingent || 0,
        fee_per_athlete: event.fee_per_athlete || 0,
        payment_method_ids: event.payment_method_ids || [],
    });

    const tournamentForm = useForm({
        match_duration_minutes: event.match_duration_minutes || 10,
        minimum_rest_minutes: event.minimum_rest_minutes || 15,
        minimum_entries_per_category: event.minimum_entries_per_category || 3,
        minimum_contingents_per_category: event.minimum_contingents_per_category || 3,
    });

    const coverForm = useForm({ cover_image: null });

    // Form: Age Category (CRUD)
    const ageForm = useForm({
        name: '',
        min_age: '',
        max_age: '',
        fee: 400000,
        description: '',
        order: 0,
        is_active: true,
    });

    // Form: Court (CRUD)
    const courtForm = useForm({
        name: '',
        location: '',
        description: '',
        order: 0,
        is_active: true,
    });

    // Form: Match Category (CRUD)
    const matchForm = useForm({
        name: '',
        age_category_id: '',
        weight_class_id: '',
        type: 'embu',
        gender: 'male',
        capacity: 16,
        max_athletes_per_team: 1,
        min_weight: '',
        max_weight: '',
        min_kyu: '',
        max_kyu: '',
        order: 0,
        is_active: true,
    });

    // Form: Rundown (CRUD)
    const rundownForm = useForm({
        date: event.start_date || '',
        time: '08:00',
        end_time: '12:00',
        name: '',
        type: 'Pertandingan',
        description: '',
        order: 0,
        is_match_session: true,
    });

    const refereeAssignmentForm = useForm({ referee_id: '', role: 'referee' });
    const newRefereeForm = useForm({ create_new: true, name: '', dan_grade: '', license_number: '', region: '', phone: '', role: 'referee' });
    const clerkAssignmentForm = useForm({ clerk_id: '', role: 'operator' });
    const newClerkForm = useForm({ create_new: true, name: '', employee_number: '', certification: '', region: '', phone: '', role: 'operator' });
    const fieldCoordinatorAssignmentForm = useForm({ field_coordinator_id: '', assignment_area: 'court' });
    const newFieldCoordinatorForm = useForm({ create_new: true, name: '', coordinator_number: '', region: '', phone: '', assignment_area: 'court' });

    // Helper: format currency IDR
    const formatIDR = (val) => {
        const num = Number(val) || 0;
        return 'Rp ' + num.toLocaleString('id-ID');
    };

    // Helper: quick event switch
    const handleSwitchEvent = (targetEventId) => {
        if (!targetEventId || targetEventId === event.id) return;
        router.visit(`/admin/master/event/${targetEventId}/detail`);
    };

    // ══════════════════════════════════════════════════════════════
    // SUBMIT HANDLERS
    // ══════════════════════════════════════════════════════════════
    const submitGeneral = (e) => {
        e.preventDefault();
        setGeneralSaveFeedback(null);
        generalForm.put(`/admin/master/event/${event.id}/general`, {
            preserveScroll: true,
            onSuccess: () => setGeneralSaveFeedback({ type: 'success', message: 'Informasi event berhasil disimpan.' }),
            onError: () => setGeneralSaveFeedback({ type: 'error', message: 'Informasi event belum tersimpan. Periksa kolom yang ditandai di bawah.' }),
        });
    };

    const submitDates = (e) => {
        e.preventDefault();
        datesForm.put(`/admin/master/event/${event.id}/dates`, {
            preserveScroll: true,
        });
    };

    const submitFees = (e) => {
        e.preventDefault();
        feesForm.put(`/admin/master/event/${event.id}/fees`, {
            preserveScroll: true,
        });
    };

    const submitTournamentSettings = (e) => {
        e.preventDefault();
        tournamentForm.put(`/admin/master/event/${event.id}/tournament-settings`, {
            preserveScroll: true,
        });
    };

    const submitCoverImage = (e) => {
        e.preventDefault();
        coverForm.post(`/admin/master/event/${event.id}/cover`, {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => coverForm.reset(),
        });
    };

    const removeCoverImage = () => {
        router.delete(`/admin/master/event/${event.id}/cover`, { preserveScroll: true });
    };
    const submitEventUsers = (e) => {
        e.preventDefault();
        setAccessSaveFeedback(null);
        accessForm.put(`/admin/master/event/${event.id}/users`, {
            preserveScroll: true,
            onSuccess: () => setAccessSaveFeedback({ type: 'success', message: 'Penanggung jawab dan akses event berhasil disimpan.' }),
            onError: () => setAccessSaveFeedback({ type: 'error', message: 'Akses pengguna belum tersimpan. Periksa pilihan pengguna dan hak akses.' }),
        });
    };
    const addEventUser = () => {
        if (!selectedEventUserId || accessForm.data.users.some((user) => user.id === selectedEventUserId)) return;
        const user = users.find((item) => item.id === selectedEventUserId);
        if (!user) return;
        accessForm.setData('users', [...accessForm.data.users, { id: user.id, name: user.name, email: user.email, access_role: selectedEventUserRole }]);
        setSelectedEventUserId('');
        setSelectedEventUserRole('responsible');
    };

    const submitRefereeAssignment = (e) => {
        e.preventDefault();
        refereeAssignmentForm.post(`/admin/master/event/${event.id}/referee`, {
            preserveScroll: true,
            onSuccess: () => refereeAssignmentForm.setData({ referee_id: '', role: 'referee' }),
        });
    };

    const submitNewReferee = (e) => {
        e.preventDefault();
        newRefereeForm.post(`/admin/master/event/${event.id}/referee`, {
            preserveScroll: true,
            onSuccess: () => {
                setIsNewRefereeModalOpen(false);
                newRefereeForm.reset();
            },
        });
    };

    const removeEventReferee = (referee) => {
        router.delete(`/admin/master/event/${event.id}/referee/${referee.id}`, { preserveScroll: true });
    };

    const submitClerkAssignment = (e) => {
        e.preventDefault();
        clerkAssignmentForm.post(`/admin/master/event/${event.id}/clerk`, { preserveScroll: true, onSuccess: () => clerkAssignmentForm.setData({ clerk_id: '', role: 'operator' }) });
    };

    const submitNewClerk = (e) => {
        e.preventDefault();
        newClerkForm.post(`/admin/master/event/${event.id}/clerk`, { preserveScroll: true, onSuccess: () => { setIsNewClerkModalOpen(false); newClerkForm.reset(); } });
    };

    const removeEventClerk = (clerk) => router.delete(`/admin/master/event/${event.id}/clerk/${clerk.id}`, { preserveScroll: true });
    const submitFieldCoordinatorAssignment = (e) => { e.preventDefault(); fieldCoordinatorAssignmentForm.post(`/admin/master/event/${event.id}/field-coordinator`, { preserveScroll: true, onSuccess: () => fieldCoordinatorAssignmentForm.setData({ field_coordinator_id: '', assignment_area: 'court' }) }); };
    const submitNewFieldCoordinator = (e) => { e.preventDefault(); newFieldCoordinatorForm.post(`/admin/master/event/${event.id}/field-coordinator`, { preserveScroll: true, onSuccess: () => { setIsNewFieldCoordinatorModalOpen(false); newFieldCoordinatorForm.reset(); } }); };
    const removeEventFieldCoordinator = (coordinator) => router.delete(`/admin/master/event/${event.id}/field-coordinator/${coordinator.id}`, { preserveScroll: true });

    // Age Category Handlers
    const openCreateAgeModal = () => {
        setEditingAgeCategory(null);
        ageForm.reset();
        ageForm.clearErrors();
        ageForm.setData({
            name: '',
            min_age: '',
            max_age: '',
            fee: 400000,
            description: '',
            order: (ageCategories.length || 0) + 1,
            is_active: true,
        });
        setIsAgeModalOpen(true);
    };

    const openEditAgeModal = (cat) => {
        setEditingAgeCategory(cat);
        ageForm.clearErrors();
        ageForm.setData({
            name: cat.name || '',
            min_age: cat.min_age ?? '',
            max_age: cat.max_age ?? '',
            fee: cat.fee ?? 0,
            description: cat.description || '',
            order: cat.order ?? 0,
            is_active: cat.is_active ?? true,
        });
        setIsAgeModalOpen(true);
    };

    const submitAgeCategory = (e) => {
        e.preventDefault();
        if (editingAgeCategory) {
            ageForm.put(`/admin/master/event/${event.id}/age-category/${editingAgeCategory.id}`, {
                preserveScroll: true,
                onSuccess: () => {
                    setIsAgeModalOpen(false);
                    setEditingAgeCategory(null);
                },
            });
        } else {
            ageForm.post(`/admin/master/event/${event.id}/age-category`, {
                preserveScroll: true,
                onSuccess: () => {
                    setIsAgeModalOpen(false);
                    ageForm.reset();
                },
            });
        }
    };

    const confirmDeleteAgeCategory = () => {
        if (!deletingAgeCategory) return;
        router.delete(`/admin/master/event/${event.id}/age-category/${deletingAgeCategory.id}`, {
            preserveScroll: true,
            onSuccess: () => setDeletingAgeCategory(null),
        });
    };

    // Court Handlers
    const openCreateCourtModal = () => {
        setEditingCourt(null);
        courtForm.reset();
        courtForm.clearErrors();
        courtForm.setData({
            name: `Court ${(courts.length || 0) + 1}`,
            location: '',
            description: '',
            order: (courts.length || 0) + 1,
            is_active: true,
        });
        setIsCourtModalOpen(true);
    };

    const openEditCourtModal = (court) => {
        setEditingCourt(court);
        courtForm.clearErrors();
        courtForm.setData({
            name: court.name || '',
            location: court.location || '',
            description: court.description || '',
            order: court.order ?? 0,
            is_active: court.is_active ?? true,
        });
        setIsCourtModalOpen(true);
    };

    const submitCourt = (e) => {
        e.preventDefault();
        if (editingCourt) {
            courtForm.put(`/admin/master/event/${event.id}/court/${editingCourt.id}`, {
                preserveScroll: true,
                onSuccess: () => {
                    setIsCourtModalOpen(false);
                    setEditingCourt(null);
                },
            });
        } else {
            courtForm.post(`/admin/master/event/${event.id}/court`, {
                preserveScroll: true,
                onSuccess: () => {
                    setIsCourtModalOpen(false);
                    courtForm.reset();
                },
            });
        }
    };

    const confirmDeleteCourt = () => {
        if (!deletingCourt) return;
        router.delete(`/admin/master/event/${event.id}/court/${deletingCourt.id}`, {
            preserveScroll: true,
            onSuccess: () => setDeletingCourt(null),
        });
    };

    // Match Category Handlers
    const openCreateMatchModal = () => {
        setEditingMatchCategory(null);
        matchForm.reset();
        matchForm.clearErrors();
        matchForm.setData({
            name: '',
            age_category_id: ageCategories.length > 0 ? ageCategories[0].id : '',
            weight_class_id: '',
            type: 'embu',
            gender: 'male',
            capacity: 16,
            max_athletes_per_team: 1,
            min_weight: '',
            max_weight: '',
            min_kyu: '',
            max_kyu: '',
            order: (matchCategories.length || 0) + 1,
            is_active: true,
        });
        setIsMatchModalOpen(true);
    };

    const openEditMatchModal = (mc) => {
        setEditingMatchCategory(mc);
        matchForm.clearErrors();
        matchForm.setData({
            name: mc.name || '',
            age_category_id: mc.age_category_id || '',
            weight_class_id: mc.weight_class_id || '',
            type: mc.type || 'embu',
            gender: mc.gender || 'male',
            capacity: mc.capacity || 16,
            max_athletes_per_team: mc.max_athletes_per_team || 1,
            min_weight: mc.min_weight ?? '',
            max_weight: mc.max_weight ?? '',
            min_kyu: mc.min_kyu || '',
            max_kyu: mc.max_kyu || '',
            order: mc.order ?? 0,
            is_active: mc.is_active ?? true,
        });
        setIsMatchModalOpen(true);
    };

    const submitMatchCategory = (e) => {
        e.preventDefault();
        if (editingMatchCategory) {
            matchForm.put(`/admin/master/event/${event.id}/match-category/${editingMatchCategory.id}`, {
                preserveScroll: true,
                onSuccess: () => {
                    setIsMatchModalOpen(false);
                    setEditingMatchCategory(null);
                },
            });
        } else {
            matchForm.post(`/admin/master/event/${event.id}/match-category`, {
                preserveScroll: true,
                onSuccess: () => {
                    setIsMatchModalOpen(false);
                    matchForm.reset();
                },
            });
        }
    };

    const confirmDeleteMatchCategory = () => {
        if (!deletingMatchCategory) return;
        router.delete(`/admin/master/event/${event.id}/match-category/${deletingMatchCategory.id}`, {
            preserveScroll: true,
            onSuccess: () => setDeletingMatchCategory(null),
        });
    };

    // Rundown Handlers
    const openCreateRundownModal = () => {
        setEditingRundown(null);
        rundownForm.reset();
        rundownForm.clearErrors();
        rundownForm.setData({
            date: event.start_date || '',
            time: '08:00',
            end_time: '12:00',
            name: '',
            type: 'Pertandingan',
            description: '',
            order: (rundowns.length || 0) + 1,
            is_match_session: true,
        });
        setIsRundownModalOpen(true);
    };

    const openEditRundownModal = (rd) => {
        setEditingRundown(rd);
        rundownForm.clearErrors();
        rundownForm.setData({
            date: rd.date_only || event.start_date || '',
            time: rd.time_only || '08:00',
            end_time: rd.end_time_only || '',
            name: rd.name || '',
            type: rd.type || 'Pertandingan',
            description: rd.description || '',
            order: rd.order ?? 0,
            is_match_session: Boolean(rd.is_match_session),
        });
        setIsRundownModalOpen(true);
    };

    const submitRundown = (e) => {
        e.preventDefault();
        if (editingRundown) {
            rundownForm.put(`/admin/master/event/${event.id}/rundown/${editingRundown.id}`, {
                preserveScroll: true,
                onSuccess: () => {
                    setIsRundownModalOpen(false);
                    setEditingRundown(null);
                },
            });
        } else {
            rundownForm.post(`/admin/master/event/${event.id}/rundown`, {
                preserveScroll: true,
                onSuccess: () => {
                    setIsRundownModalOpen(false);
                    rundownForm.reset();
                },
            });
        }
    };

    const confirmDeleteRundown = () => {
        if (!deletingRundown) return;
        router.delete(`/admin/master/event/${event.id}/rundown/${deletingRundown.id}`, {
            preserveScroll: true,
            onSuccess: () => setDeletingRundown(null),
        });
    };

    // ══════════════════════════════════════════════════════════════
    // FILTERED & PAGINATED DATA (Standardized to Dashboard Pattern)
    // ══════════════════════════════════════════════════════════════
    // 1. Kelompok Umur
    const filteredAgeCategories = ageCategories.filter((cat) => {
        if (!ageSearch) return true;
        const q = ageSearch.toLowerCase();
        return (
            cat.name?.toLowerCase().includes(q) ||
            cat.description?.toLowerCase().includes(q) ||
            cat.age_range?.toLowerCase().includes(q)
        );
    });
    const paginatedAgeCategories = filteredAgeCategories.slice(
        (agePage - 1) * itemsPerPage,
        agePage * itemsPerPage
    );

    // 2. Lapangan (Court / Tatami)
    const filteredCourts = courts.filter((court) => {
        if (!courtSearch) return true;
        const q = courtSearch.toLowerCase();
        return (
            court.name?.toLowerCase().includes(q) ||
            court.location?.toLowerCase().includes(q) ||
            court.description?.toLowerCase().includes(q)
        );
    });
    const paginatedCourts = filteredCourts.slice(
        (courtPage - 1) * itemsPerPage,
        courtPage * itemsPerPage
    );

    // 3. Nomer Pertandingan
    const filteredMatches = matchCategories.filter((mc) => {
        const matchesQuery =
            !matchSearch ||
            mc.name?.toLowerCase().includes(matchSearch.toLowerCase()) ||
            mc.age_category_name?.toLowerCase().includes(matchSearch.toLowerCase());

        const matchesType = matchTypeFilter === 'all' || mc.type === matchTypeFilter;
        const matchesGender = matchGenderFilter === 'all' || mc.gender === matchGenderFilter;
        const matchesAge = matchAgeFilter === 'all' || String(mc.age_category_id) === String(matchAgeFilter);

        return matchesQuery && matchesType && matchesGender && matchesAge;
    });
    const paginatedMatches = filteredMatches.slice(
        (matchPage - 1) * itemsPerPage,
        matchPage * itemsPerPage
    );

    // 4. Sesi Acara & Rundown
    const filteredRundowns = rundowns.filter((rd) => {
        if (!rundownSearch) return true;
        const q = rundownSearch.toLowerCase();
        return (
            rd.name?.toLowerCase().includes(q) ||
            rd.type?.toLowerCase().includes(q) ||
            rd.description?.toLowerCase().includes(q)
        );
    });
    const paginatedRundowns = filteredRundowns.slice(
        (rundownPage - 1) * itemsPerPage,
        rundownPage * itemsPerPage
    );

    // Combobox Options
    const eventSwitchOptions = allEvents.map((e) => ({
        value: e.id,
        label: `${e.name} ${e.edition ? `(${e.edition})` : ''}`,
        sublabel: [e.status_label, e.dates, e.city, e.is_active ? 'Operasional' : 'Nonaktif operasional'].filter(Boolean).join(' · '),
    }));

    const statusOptions = [
        { value: 'draft', label: 'Draft (Konsep)' },
        { value: 'open_registration', label: 'Pendaftaran Dibuka' },
        { value: 'ongoing', label: 'Sedang Berlangsung' },
        { value: 'completed', label: 'Selesai' },
        { value: 'closed', label: 'Ditutup' },
    ];

    const ageCategoryOptions = ageCategories.map((ac) => ({
        value: ac.id,
        label: ac.name,
        sublabel: `${ac.age_range} · ${ac.fee_formatted}`,
    }));

    const matchTypeOptions = [
        { value: 'embu', label: 'Embu (Kerapian Teknik)' },
        { value: 'randori', label: 'Randori (Tarung Bebas)' },
    ];

    const matchGenderOptions = [
        { value: 'male', label: 'Putra' },
        { value: 'female', label: 'Putri' },
        { value: 'mixed', label: 'Campuran' },
    ];

    const teamSizeOptions = [
        { value: 1, label: '1 Atlet per Tim' },
        { value: 2, label: '2 Atlet per Tim' },
        { value: 4, label: '4 Atlet per Tim' },
    ];

    const kyuOptions = kyus.map((kyu) => ({
        value: kyu.name,
        label: kyu.name,
        sublabel: kyu.belt_color ? `Sabuk ${kyu.belt_color}` : null,
    }));

    const weightClassOptions = weightClasses.map((weightClass) => ({
        value: weightClass.id,
        label: weightClass.name,
        sublabel: `${weightClass.gender === 'male' ? 'Putra' : weightClass.gender === 'female' ? 'Putri' : 'Campuran'} · ${weightClass.min_weight ?? '—'}–${weightClass.max_weight ?? '∞'} kg`,
    }));

    const refereeOptions = referees.map((referee) => ({
        value: referee.id,
        label: referee.name,
        sublabel: [referee.dan_grade, referee.certification_level, referee.region].filter(Boolean).join(' · '),
    }));

    const refereeRoleOptions = [
        { value: 'chief', label: 'Ketua / Wasit Utama' },
        { value: 'referee', label: 'Wasit' },
        { value: 'judge', label: 'Juri' },
        { value: 'reserve', label: 'Cadangan' },
    ];

    const clerkOptions = clerks.map((clerk) => ({ value: clerk.id, label: clerk.name, sublabel: [clerk.certification, clerk.region].filter(Boolean).join(' · ') }));
    const clerkRoleOptions = [
        { value: 'chief_secretary', label: 'Ketua Panitera' },
        { value: 'scorer', label: 'Pencatat Nilai' },
        { value: 'timekeeper', label: 'Pencatat Waktu' },
        { value: 'announcer', label: 'Pengumum' },
        { value: 'operator', label: 'Operator' },
    ];
    const fieldCoordinatorOptions = fieldCoordinators.map((coordinator) => ({ value: coordinator.id, label: coordinator.name, sublabel: [coordinator.coordinator_number, coordinator.region].filter(Boolean).join(' · ') }));
    const fieldCoordinatorAreaOptions = [{ value: 'chief', label: 'Koordinator Utama' }, { value: 'court', label: 'Koordinator Lapangan / Court' }, { value: 'logistics', label: 'Koordinator Logistik' }, { value: 'liaison', label: 'Liaison / Penghubung' }];
    const userOptions = users.map((user) => ({ value: user.id, label: user.name, sublabel: `${user.email}${user.roles?.length ? ` · ${user.roles.join(', ')}` : ''}` }));
    const eventAccessRoleOptions = [
        { value: 'responsible', label: 'Penanggung Jawab Event' },
        { value: 'admin', label: 'Admin Event' },
        { value: 'staff', label: 'Staf Event' },
        { value: 'viewer', label: 'Hanya Melihat' },
    ];

    const applyWeightClass = (weightClassId) => {
        const weightClass = weightClasses.find((item) => String(item.id) === String(weightClassId));

        matchForm.setData({
            ...matchForm.data,
            weight_class_id: weightClassId,
            min_weight: weightClass?.min_weight ?? '',
            max_weight: weightClass?.max_weight ?? '',
        });
    };

    const rundownTypeOptions = [
        { value: 'Upacara / Pembukaan', label: 'Upacara / Pembukaan' },
        { value: 'Technical Meeting', label: 'Technical Meeting' },
        { value: 'Penimbangan Badan', label: 'Penimbangan Badan' },
        { value: 'Pertandingan', label: 'Pertandingan' },
        { value: 'Istirahat / Ishoma', label: 'Istirahat / Ishoma' },
        { value: 'Upacara Penghormatan Pemenang (UPP)', label: 'Upacara Penghormatan Pemenang (UPP)' },
        { value: 'Penutupan', label: 'Penutupan' },
    ];

    return (
        <AdminLayout auth={auth} title="Pengaturan Event">
            <Head title={`Pengaturan & Detail - ${event.name || 'Event'}`} />

            <div className="space-y-6 pb-4">
                {/* ════ EVENT HEADER BANNER ════ */}
                <div className="rounded-2xl bg-gradient-to-r from-[#141210] via-[#1c1917] to-[#292524] text-white p-6 shadow-xl border border-white/10 relative overflow-visible">
                    {/* Background martial emblem accent */}
                    <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
                        <div className="absolute -right-10 -bottom-10 opacity-10 text-amber-400">
                            <i className="fa-solid fa-yin-yang text-[180px]"></i>
                        </div>
                    </div>

                    <div className="relative z-30 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                        <div className="space-y-2 max-w-3xl">
                            <div className="flex flex-wrap items-center gap-3">
                                <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-white flex items-center gap-3">
                                    {event.name}
                                </h1>
                                {event.edition && (
                                    <span className="px-2.5 py-0.5 text-xs font-semibold rounded-md bg-amber-400/20 text-amber-300 border border-amber-400/30">
                                        {event.edition}
                                    </span>
                                )}
                                {event.is_active ? (
                                    <span className="px-2.5 py-0.5 text-xs font-semibold rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                                        Aktif untuk Operasional
                                    </span>
                                ) : (
                                    <span className="px-2.5 py-0.5 text-xs font-semibold rounded-md bg-white/10 text-white/70 border border-white/10">
                                        Non-Aktif
                                    </span>
                                )}
                            </div>

                            <p className="text-sm text-white/70 flex flex-wrap items-center gap-x-4 gap-y-1 pt-1">
                                <span className="flex items-center gap-1.5">
                                    <i className="fa-solid fa-location-dot text-amber-400 text-xs"></i>
                                    {event.venue}, {event.city}
                                </span>
                                <span className="flex items-center gap-1.5">
                                    <i className="fa-regular fa-calendar text-amber-400 text-xs"></i>
                                    {event.start_date_formatted} - {event.end_date_formatted}
                                </span>
                                {event.organizer && (
                                    <span className="flex items-center gap-1.5">
                                        <i className="fa-solid fa-shield-halved text-amber-400 text-xs"></i>
                                        {event.organizer}
                                    </span>
                                )}
                            </p>
                        </div>

                        {/* Event Switcher Dropdown */}
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 min-w-[280px]">
                            <div className="w-full">
                                <label className="text-[11px] font-semibold text-white/60 mb-1 block uppercase tracking-wider">
                                    Pindah Event:
                                </label>
                                <Combobox
                                    value={event.id}
                                    onChange={handleSwitchEvent}
                                    options={eventSwitchOptions}
                                    size="sm"
                                    clearable={false}
                                    searchPlaceholder="Pilih atau cari event..."
                                    className="w-full text-gray-900"
                                />
                            </div>
                            <div className="sm:pt-5">
                                <Link href="/admin/master/event">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="w-full bg-white/10 hover:bg-white/20 text-white border-white/20 hover:border-white/30 whitespace-nowrap"
                                    >
                                        <i className="fa-solid fa-list mr-1.5 text-xs"></i>
                                        Daftar Event
                                    </Button>
                                </Link>
                            </div>
                        </div>
                    </div>

                    {/* Stats pills */}
                    <div className="mt-6 pt-5 border-t border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                            <p className="text-[11px] font-medium text-white/60">Kelompok Umur</p>
                            <p className="text-xl font-bold text-amber-400 mt-0.5">
                                {counts.age_categories} <span className="text-xs font-normal text-white/50">Kategori</span>
                            </p>
                        </div>
                        <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                            <p className="text-[11px] font-medium text-white/60">Lapangan / Tatami</p>
                            <p className="text-xl font-bold text-amber-400 mt-0.5">
                                {counts.courts} <span className="text-xs font-normal text-white/50">Court</span>
                            </p>
                        </div>
                        <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                            <p className="text-[11px] font-medium text-white/60">Nomer Pertandingan</p>
                            <p className="text-xl font-bold text-amber-400 mt-0.5">
                                {counts.match_categories} <span className="text-xs font-normal text-white/50">Nomor</span>
                            </p>
                        </div>
                        <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                            <p className="text-[11px] font-medium text-white/60">Sesi Acara Rundown</p>
                            <p className="text-xl font-bold text-amber-400 mt-0.5">
                                {counts.rundowns} <span className="text-xs font-normal text-white/50">Sesi</span>
                            </p>
                        </div>
                    </div>
                </div>

                {/* ════ TAB NAVIGATION ════ */}
                <div className="relative bg-white border border-[#e5e0d8] rounded-xl shadow-sm p-1.5 sticky top-2 z-20">
                    <div
                        ref={tabScrollRef}
                        onScroll={checkTabScroll}
                        onWheel={handleTabWheel}
                        className="flex gap-1.5 overflow-x-auto scroll-smooth no-scrollbar"
                    >
                        {[
                            {
                                id: 'age_categories',
                                label: 'Kelompok Umur',
                                icon: 'fa-users-line',
                                count: counts.age_categories,
                                badgeColor: 'bg-amber-100 text-amber-800',
                            },
                            { id: 'participant_rules', label: 'Persyaratan Peserta', icon: 'fa-user-shield' },
                            {
                                id: 'courts',
                                label: 'Lapangan (Court)',
                                icon: 'fa-square-vector',
                                count: counts.courts,
                                badgeColor: 'bg-blue-100 text-blue-800',
                            },
                            {
                                id: 'matches',
                                label: 'Nomer Pertandingan',
                                icon: 'fa-award',
                                count: counts.match_categories,
                                badgeColor: 'bg-emerald-100 text-emerald-800',
                            },
                            {
                                id: 'rundown',
                                label: 'Sesi Acara & Rundown',
                                icon: 'fa-clock-rotate-left',
                                count: counts.rundowns,
                                badgeColor: 'bg-purple-100 text-purple-800',
                            },
                            {
                                id: 'tournament',
                                label: 'Pertandingan & Drawing',
                                icon: 'fa-diagram-project',
                                count: tournamentSummary.total_matches,
                                badgeColor: 'bg-orange-100 text-orange-800',
                            },
                            {
                                id: 'referees',
                                label: 'Wasit & Juri',
                                icon: 'fa-scale-balanced',
                                count: counts.referees,
                                badgeColor: 'bg-rose-100 text-rose-800',
                            },
                            {
                                id: 'clerks',
                                label: 'Panitera',
                                icon: 'fa-clipboard-list',
                                count: counts.clerks,
                                badgeColor: 'bg-cyan-100 text-cyan-800',
                            },
                            { id: 'field_coordinators', label: 'Koordinator Lapangan', icon: 'fa-people-group', count: counts.field_coordinators, badgeColor: 'bg-lime-100 text-lime-800' },
                            {
                                id: 'info',
                                label: 'Informasi Event',
                                icon: 'fa-circle-info',
                            },
                            {
                                id: 'dates',
                                label: 'Tanggal Acara',
                                icon: 'fa-calendar-days',
                            },
                            {
                                id: 'fees',
                                label: 'Biaya Kontingen',
                                icon: 'fa-money-bill-wave',
                            },
                        ].map((tab) => {
                            const isActive = activeTab === tab.id;
                            return (
                                <Button variant="unstyled" size="none"
                                    key={tab.id}
                                    type="button"
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex shrink-0 items-center gap-2 px-3.5 py-2.5 rounded-lg text-sm font-semibold whitespace-nowrap transition-all cursor-pointer ${
                                        isActive
                                            ? 'bg-[#141210] text-amber-400 shadow-sm'
                                            : 'text-[#504840] hover:bg-[#f6f4ef] hover:text-[#141210]'
                                    }`}
                                >
                                    <i className={`fa-solid ${tab.icon} text-xs ${isActive ? 'text-amber-400' : 'text-[#8a7f72]'}`}></i>
                                    <span>{tab.label}</span>
                                    {tab.count !== undefined && (
                                        <span
                                            className={`px-1.5 py-0.2 rounded-full text-[11px] font-bold ${
                                                isActive
                                                    ? 'bg-amber-400/20 text-amber-300'
                                                    : tab.badgeColor || 'bg-gray-100 text-gray-700'
                                            }`}
                                        >
                                            {tab.count}
                                        </span>
                                    )}
                                </Button>
                            );
                        })}
                    </div>

                    {canScrollLeft && (
                        <Button variant="unstyled" size="none"
                            type="button"
                            onClick={() => scrollTabs('left')}
                            className="absolute left-2 top-1/2 -translate-y-1/2 flex size-8 items-center justify-center rounded-full border border-[#e5e0d8] bg-white text-[#504840] shadow-md transition-colors hover:bg-[#f6f4ef] focus:outline-none focus:ring-2 focus:ring-amber-400"
                            aria-label="Geser tab ke kiri"
                        >
                            <i className="fa-solid fa-chevron-left text-xs" aria-hidden="true"></i>
                        </Button>
                    )}

                    {canScrollRight && (
                        <Button variant="unstyled" size="none"
                            type="button"
                            onClick={() => scrollTabs('right')}
                            className="absolute right-2 top-1/2 -translate-y-1/2 flex size-8 items-center justify-center rounded-full border border-[#e5e0d8] bg-white text-[#504840] shadow-md transition-colors hover:bg-[#f6f4ef] focus:outline-none focus:ring-2 focus:ring-amber-400"
                            aria-label="Geser tab ke kanan"
                        >
                            <i className="fa-solid fa-chevron-right text-xs" aria-hidden="true"></i>
                        </Button>
                    )}
                </div>

                {/* ════ TAB 1: KELOMPOK UMUR & HARGA (DASHBOARD STYLE) ════ */}
                {activeTab === 'participant_rules' && <ParticipantRulesForm key={event.id} event={event} />}
                {activeTab === 'age_categories' && (
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-[#ede9e1] dark:border-slate-800 shadow-xs overflow-hidden">
                        {/* Table Header / Toolbar */}
                        <div className="p-5 md:px-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                                <div className="flex items-center gap-3">
                                    <h3 className="font-cinzel text-base md:text-lg font-bold text-[#0f0d0b] dark:text-white tracking-wide uppercase">
                                        Kelompok Umur & Tarif
                                    </h3>
                                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#c0392b]/10 text-[#c0392b] dark:bg-[#c0392b]/20 dark:text-[#f0c060] border border-[#c0392b]/20">
                                        {ageCategories.length} Total
                                    </span>
                                </div>
                                <p className="text-xs text-[#b5afa6] dark:text-slate-400 mt-1">
                                    Daftar kelompok usia kenshi beserta tarif pendaftaran masing-masing kategori
                                </p>
                            </div>

                            <div className="flex items-center gap-2.5 flex-wrap">
                                {/* Search Input Bar */}
                                <Input type="search" size="sm" value={ageSearch} onChange={(event) => {
                                    setAgeSearch(event.target.value);
                                    setAgePage(1);
                                }} placeholder="Cari kelompok umur..." iconLeft={<i className="fa-solid fa-magnifying-glass" aria-hidden="true" />}
                                    clearable onClear={() => { setAgeSearch(''); setAgePage(1); }} containerClassName="w-56 sm:w-64" />

                                <Button variant="unstyled" size="none"
                                    type="button"
                                    onClick={openCreateAgeModal}
                                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-[#c0392b] to-[#96281b] hover:from-[#a93226] hover:to-[#7b1f14] shadow-xs hover:shadow-md transition-all cursor-pointer shrink-0"
                                    title="Tambah Kelompok Umur Baru"
                                >
                                    <i className="fa-solid fa-plus text-xs"></i>
                                    <span>Tambah Kelompok Umur</span>
                                </Button>
                            </div>
                        </div>

                        {/* Table Content */}
                        <TableContainer ariaLabel="Tabel data">
                            <table className="responsive-data-table whitespace-nowrap w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-[#f7f4ef] dark:bg-slate-800/70 border-y border-[#ede9e1] dark:border-slate-800 text-[10px] uppercase font-semibold text-[#8c827a] dark:text-slate-400 tracking-wider whitespace-nowrap">
                                        <th scope="col" className="py-3 px-4 text-center w-14">#</th>
                                        <th scope="col" className="py-3 px-4 min-w-[220px]">Kelompok Umur</th>
                                        <th scope="col" className="py-3 px-4 min-w-[140px]">Rentang Usia</th>
                                        <th scope="col" className="py-3 px-4 min-w-[150px]">Tarif Pendaftaran</th>
                                        <th scope="col" className="py-3 px-4 min-w-[220px]">Keterangan / Kelahiran</th>
                                        <th scope="col" className="py-3 px-4 text-center w-32">Nomer Tanding</th>
                                        <th scope="col" className="py-3 px-4 text-center w-28">Status</th>
                                        <th scope="col" className="py-3 px-4 text-center w-24">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#ede9e1]/80 dark:divide-slate-800/80 text-xs">
                                    {paginatedAgeCategories.length > 0 ? (
                                        paginatedAgeCategories.map((cat, idx) => (
                                            <tr
                                                key={cat.id}
                                                className="hover:bg-[#fcfbf9] dark:hover:bg-slate-800/40 transition-colors group"
                                            >
                                                {/* Row Index */}
                                                <td className="py-3.5 px-4 text-center text-[#888] dark:text-slate-500 font-mono text-[11px] whitespace-nowrap">
                                                    {(agePage - 1) * itemsPerPage + idx + 1}
                                                </td>

                                                {/* Kelompok Umur with Initials Avatar Badge */}
                                                <td className="py-3.5 px-4 font-medium text-[#0f0d0b] dark:text-white">
                                                    <div className="flex items-center gap-3">
                                                        <div
                                                            className="w-8 h-8 rounded-xl text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform"
                                                            style={{
                                                                background: 'linear-gradient(135deg, #c0392b, #d4a843)',
                                                            }}
                                                        >
                                                            {(cat.name || 'KU').substring(0, 2).toUpperCase()}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p
                                                                onClick={() => openEditAgeModal(cat)}
                                                                className="font-semibold text-slate-900 dark:text-white text-xs sm:text-sm group-hover:text-[#c0392b] dark:group-hover:text-[#f0c060] transition-colors cursor-pointer truncate"
                                                            >
                                                                {cat.name}
                                                            </p>
                                                            <p className="text-[10px] text-[#8c827a] dark:text-slate-400 font-mono mt-0.5 flex items-center gap-1">
                                                                <i className="fa-solid fa-hashtag text-[8px] opacity-70"></i>
                                                                <span>Urutan #{cat.order}</span>
                                                            </p>
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* Rentang Usia */}
                                                <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300 font-medium whitespace-nowrap">
                                                    <div className="flex items-center gap-1.5">
                                                        <i className="fa-regular fa-calendar-check text-[11px] text-[#c0392b]/70 shrink-0"></i>
                                                        <span>{cat.age_range}</span>
                                                    </div>
                                                </td>

                                                {/* Tarif Pendaftaran (Bold Mono like Dashboard Total Tagihan) */}
                                                <td className="py-3.5 px-4 font-mono font-bold text-[#0f0d0b] dark:text-white whitespace-nowrap text-sm">
                                                    {cat.fee_formatted}
                                                </td>

                                                {/* Keterangan */}
                                                <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400 text-xs">
                                                    <span className="truncate block max-w-xs">{cat.description || '-'}</span>
                                                </td>

                                                {/* Nomer Tanding Count */}
                                                <td className="py-3.5 px-4 text-center whitespace-nowrap">
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800">
                                                        <i className="fa-solid fa-award text-[10px] text-amber-600"></i>
                                                        {cat.match_categories_count} Nomor
                                                    </span>
                                                </td>

                                                {/* Status */}
                                                <td className="py-3.5 px-4 text-center whitespace-nowrap">
                                                    {cat.is_active ? (
                                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                                            Aktif
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                                                            Nonaktif
                                                        </span>
                                                    )}
                                                </td>

                                                {/* Action Buttons */}
                                                <td className="py-3.5 px-4 text-center whitespace-nowrap">
                                                    <div className="flex items-center justify-center gap-1.5">
                                                        <Button variant="unstyled" size="none"
                                                            type="button"
                                                            onClick={() => openEditAgeModal(cat)}
                                                            className="w-8 h-8 rounded-xl border border-[#ede9e1] dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-[#c0392b] hover:text-white hover:border-[#c0392b] dark:hover:bg-[#c0392b] transition-all inline-flex items-center justify-center cursor-pointer shadow-xs hover:scale-105"
                                                            title="Edit Kelompok Umur"
                                                        >
                                                            <i className="fa-solid fa-pen-to-square text-xs"></i>
                                                        </Button>
                                                        <Button variant="unstyled" size="none"
                                                            type="button"
                                                            onClick={() => setDeletingAgeCategory(cat)}
                                                            className="w-8 h-8 rounded-xl border border-[#ede9e1] dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-300 transition-all inline-flex items-center justify-center cursor-pointer shadow-xs hover:scale-105"
                                                            title="Hapus Kelompok Umur"
                                                        >
                                                            <i className="fa-solid fa-trash-can text-xs"></i>
                                                        </Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={8} className="py-12 text-center text-[#b5afa6] italic text-xs">
                                                <i className="fa-solid fa-users-line text-3xl mb-2 block opacity-40"></i>
                                                Belum ada data kelompok umur yang sesuai.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table></TableContainer>

                        {/* Table Footer with Pagination Controls */}
                        {filteredAgeCategories.length > 0 && (
                            <Pagination
                                currentPage={agePage}
                                totalPages={Math.ceil(filteredAgeCategories.length / itemsPerPage) || 1}
                                total={filteredAgeCategories.length}
                                from={(agePage - 1) * itemsPerPage + 1}
                                to={Math.min(agePage * itemsPerPage, filteredAgeCategories.length)}
                                onPageChange={(p) => setAgePage(p)}
                                label="kelompok umur"
                                variant="footer"
                            />
                        )}
                    </div>
                )}

                {/* ════ TAB 2: LAPANGAN (COURT / TATAMI) (DASHBOARD STYLE) ════ */}
                {activeTab === 'courts' && (
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-[#ede9e1] dark:border-slate-800 shadow-xs overflow-hidden">
                        {/* Table Header / Toolbar */}
                        <div className="p-5 md:px-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                                <div className="flex items-center gap-3">
                                    <h3 className="font-cinzel text-base md:text-lg font-bold text-[#0f0d0b] dark:text-white tracking-wide uppercase">
                                        Lapangan & Tatami
                                    </h3>
                                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#c0392b]/10 text-[#c0392b] dark:bg-[#c0392b]/20 dark:text-[#f0c060] border border-[#c0392b]/20">
                                        {courts.length} Total
                                    </span>
                                </div>
                                <p className="text-xs text-[#b5afa6] dark:text-slate-400 mt-1">
                                    Daftar gelanggang pertandingan yang digunakan untuk jadwal partai dan penugasan wasit
                                </p>
                            </div>

                            <div className="flex items-center gap-2.5 flex-wrap">
                                {/* Search Input Bar */}
                                <Input type="search" size="sm" value={courtSearch} onChange={(event) => {
                                    setCourtSearch(event.target.value);
                                    setCourtPage(1);
                                }} placeholder="Cari lapangan, tatami..." iconLeft={<i className="fa-solid fa-magnifying-glass" aria-hidden="true" />}
                                    clearable onClear={() => { setCourtSearch(''); setCourtPage(1); }} containerClassName="w-56 sm:w-64" />

                                <Button variant="unstyled" size="none"
                                    type="button"
                                    onClick={openCreateCourtModal}
                                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-[#c0392b] to-[#96281b] hover:from-[#a93226] hover:to-[#7b1f14] shadow-xs hover:shadow-md transition-all cursor-pointer shrink-0"
                                    title="Tambah Lapangan Baru"
                                >
                                    <i className="fa-solid fa-plus text-xs"></i>
                                    <span>Tambah Lapangan (Court)</span>
                                </Button>
                            </div>
                        </div>

                        {/* Table Content */}
                        <TableContainer ariaLabel="Tabel data">
                            <table className="responsive-data-table whitespace-nowrap w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-[#f7f4ef] dark:bg-slate-800/70 border-y border-[#ede9e1] dark:border-slate-800 text-[10px] uppercase font-semibold text-[#8c827a] dark:text-slate-400 tracking-wider whitespace-nowrap">
                                        <th scope="col" className="py-3 px-4 text-center w-14">#</th>
                                        <th scope="col" className="py-3 px-4 min-w-[220px]">Nama Lapangan</th>
                                        <th scope="col" className="py-3 px-4 min-w-[200px]">Lokasi / Gelanggang</th>
                                        <th scope="col" className="py-3 px-4 min-w-[220px]">Keterangan</th>
                                        <th scope="col" className="py-3 px-4 text-center w-24">Urutan</th>
                                        <th scope="col" className="py-3 px-4 text-center w-28">Status</th>
                                        <th scope="col" className="py-3 px-4 text-center w-24">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#ede9e1]/80 dark:divide-slate-800/80 text-xs">
                                    {paginatedCourts.length > 0 ? (
                                        paginatedCourts.map((court, idx) => (
                                            <tr
                                                key={court.id}
                                                className="hover:bg-[#fcfbf9] dark:hover:bg-slate-800/40 transition-colors group"
                                            >
                                                {/* Index */}
                                                <td className="py-3.5 px-4 text-center text-[#888] dark:text-slate-500 font-mono text-[11px] whitespace-nowrap">
                                                    {(courtPage - 1) * itemsPerPage + idx + 1}
                                                </td>

                                                {/* Court Name with Avatar Badge */}
                                                <td className="py-3.5 px-4 font-medium text-[#0f0d0b] dark:text-white">
                                                    <div className="flex items-center gap-3">
                                                        <div
                                                            className="w-8 h-8 rounded-xl text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform"
                                                            style={{
                                                                background: 'linear-gradient(135deg, #c0392b, #d4a843)',
                                                            }}
                                                        >
                                                            {court.name.replace(/[^0-9A-Za-z]/g, '').substring(0, 2).toUpperCase() || 'CT'}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p
                                                                onClick={() => openEditCourtModal(court)}
                                                                className="font-semibold text-slate-900 dark:text-white text-xs sm:text-sm group-hover:text-[#c0392b] dark:group-hover:text-[#f0c060] transition-colors cursor-pointer truncate"
                                                            >
                                                                {court.name}
                                                            </p>
                                                            <p className="text-[10px] text-[#8c827a] dark:text-slate-400 font-mono mt-0.5 flex items-center gap-1">
                                                                <i className="fa-solid fa-hashtag text-[8px] opacity-70"></i>
                                                                <span>Urutan #{court.order}</span>
                                                            </p>
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* Location with Pin */}
                                                <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300 font-medium whitespace-nowrap">
                                                    <div className="flex items-center gap-1.5">
                                                        <i className="fa-solid fa-location-dot text-[11px] text-[#c0392b]/70 shrink-0"></i>
                                                        <span className="truncate">{court.location || '-'}</span>
                                                    </div>
                                                </td>

                                                {/* Description */}
                                                <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400 text-xs">
                                                    <span className="truncate block max-w-xs">{court.description || '-'}</span>
                                                </td>

                                                {/* Order */}
                                                <td className="py-3.5 px-4 text-center font-mono text-[#8c827a] text-xs whitespace-nowrap">
                                                    #{court.order}
                                                </td>

                                                {/* Status */}
                                                <td className="py-3.5 px-4 text-center whitespace-nowrap">
                                                    {court.is_active ? (
                                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                                            Aktif
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                                                            Nonaktif
                                                        </span>
                                                    )}
                                                </td>

                                                {/* Action Buttons */}
                                                <td className="py-3.5 px-4 text-center whitespace-nowrap">
                                                    <div className="flex items-center justify-center gap-1.5">
                                                        <Button variant="unstyled" size="none"
                                                            type="button"
                                                            onClick={() => openEditCourtModal(court)}
                                                            className="w-8 h-8 rounded-xl border border-[#ede9e1] dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-[#c0392b] hover:text-white hover:border-[#c0392b] dark:hover:bg-[#c0392b] transition-all inline-flex items-center justify-center cursor-pointer shadow-xs hover:scale-105"
                                                            title="Edit Lapangan"
                                                        >
                                                            <i className="fa-solid fa-pen-to-square text-xs"></i>
                                                        </Button>
                                                        <Button variant="unstyled" size="none"
                                                            type="button"
                                                            onClick={() => setDeletingCourt(court)}
                                                            className="w-8 h-8 rounded-xl border border-[#ede9e1] dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-300 transition-all inline-flex items-center justify-center cursor-pointer shadow-xs hover:scale-105"
                                                            title="Hapus Lapangan"
                                                        >
                                                            <i className="fa-solid fa-trash-can text-xs"></i>
                                                        </Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={7} className="py-12 text-center text-[#b5afa6] italic text-xs">
                                                <i className="fa-solid fa-square-vector text-3xl mb-2 block opacity-40"></i>
                                                Belum ada data lapangan / tatami yang sesuai.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table></TableContainer>

                        {/* Table Footer with Pagination Controls */}
                        {filteredCourts.length > 0 && (
                            <Pagination
                                currentPage={courtPage}
                                totalPages={Math.ceil(filteredCourts.length / itemsPerPage) || 1}
                                total={filteredCourts.length}
                                from={(courtPage - 1) * itemsPerPage + 1}
                                to={Math.min(courtPage * itemsPerPage, filteredCourts.length)}
                                onPageChange={(p) => setCourtPage(p)}
                                label="lapangan"
                                variant="footer"
                            />
                        )}
                    </div>
                )}

                {/* ════ TAB 3: NOMER PERTANDINGAN (DASHBOARD STYLE) ════ */}
                {activeTab === 'matches' && (
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-[#ede9e1] dark:border-slate-800 shadow-xs overflow-hidden">
                        {/* Table Header / Toolbar */}
                        <div className="p-5 md:px-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                                <div className="flex items-center gap-3">
                                    <h3 className="font-cinzel text-base md:text-lg font-bold text-[#0f0d0b] dark:text-white tracking-wide uppercase">
                                        Nomer Pertandingan
                                    </h3>
                                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#c0392b]/10 text-[#c0392b] dark:bg-[#c0392b]/20 dark:text-[#f0c060] border border-[#c0392b]/20">
                                        {matchCategories.length} Total
                                    </span>
                                </div>
                                <p className="text-xs text-[#b5afa6] dark:text-slate-400 mt-1">
                                    Konfigurasi nomor tanding dengan relasi kelompok umur, kuota peserta, gender, dan tipe pertandingan
                                </p>
                            </div>

                            <div className="flex items-center gap-2.5 flex-wrap">
                                <Button variant="unstyled" size="none"
                                    type="button"
                                    onClick={openCreateMatchModal}
                                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-[#c0392b] to-[#96281b] hover:from-[#a93226] hover:to-[#7b1f14] shadow-xs hover:shadow-md transition-all cursor-pointer shrink-0"
                                    title="Tambah Nomer Pertandingan"
                                >
                                    <i className="fa-solid fa-plus text-xs"></i>
                                    <span>Tambah Nomer Pertandingan</span>
                                </Button>
                            </div>
                        </div>

                        {/* Search & Filters Bar (Dashboard Input Style) */}
                        <div className="p-4 px-5 md:px-6 bg-[#fcfbf9] border-y border-[#ede9e1] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                            <Input type="search" size="sm" value={matchSearch} onChange={(event) => {
                                setMatchSearch(event.target.value);
                                setMatchPage(1);
                            }} placeholder="Cari nomor pertandingan..." iconLeft={<i className="fa-solid fa-magnifying-glass" aria-hidden="true" />} />
                            <div>
                                <Combobox
                                    size="sm"
                                    value={matchAgeFilter}
                                    onChange={(val) => {
                                        setMatchAgeFilter(val || 'all');
                                        setMatchPage(1);
                                    }}
                                    options={[
                                        { value: 'all', label: 'Semua Kelompok Umur' },
                                        ...ageCategoryOptions,
                                    ]}
                                    clearable={false}
                                    searchPlaceholder="Filter kelompok umur..."
                                />
                            </div>
                            <div>
                                <Combobox
                                    size="sm"
                                    value={matchTypeFilter}
                                    onChange={(val) => {
                                        setMatchTypeFilter(val || 'all');
                                        setMatchPage(1);
                                    }}
                                    options={[
                                        { value: 'all', label: 'Semua Tipe (Embu & Randori)' },
                                        { value: 'embu', label: 'Hanya Embu' },
                                        { value: 'randori', label: 'Hanya Randori' },
                                    ]}
                                    clearable={false}
                                    searchPlaceholder="Filter tipe..."
                                />
                            </div>
                            <div>
                                <Combobox
                                    size="sm"
                                    value={matchGenderFilter}
                                    onChange={(val) => {
                                        setMatchGenderFilter(val || 'all');
                                        setMatchPage(1);
                                    }}
                                    options={[
                                        { value: 'all', label: 'Semua Gender' },
                                        { value: 'male', label: 'Putra' },
                                        { value: 'female', label: 'Putri' },
                                        { value: 'mixed', label: 'Campuran' },
                                    ]}
                                    clearable={false}
                                    searchPlaceholder="Filter gender..."
                                />
                            </div>
                        </div>

                        {/* Table Content */}
                        <TableContainer ariaLabel="Tabel data">
                            <table className="responsive-data-table whitespace-nowrap w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-[#f7f4ef] dark:bg-slate-800/70 border-b border-[#ede9e1] dark:border-slate-800 text-[10px] uppercase font-semibold text-[#8c827a] dark:text-slate-400 tracking-wider whitespace-nowrap">
                                        <th scope="col" className="py-3 px-4 text-center w-14">#</th>
                                        <th scope="col" className="py-3 px-4 min-w-[240px]">Nomer Pertandingan</th>
                                        <th scope="col" className="py-3 px-4 min-w-[140px]">Kelompok Umur</th>
                                        <th scope="col" className="py-3 px-4 min-w-[110px]">Tipe</th>
                                        <th scope="col" className="py-3 px-4 min-w-[110px]">Gender</th>
                                        <th scope="col" className="py-3 px-4 text-center w-28">Kuota Bagan</th>
                                        <th scope="col" className="py-3 px-4 text-center min-w-[120px]">Maks. Atlet / Tim</th>
                                        <th scope="col" className="py-3 px-4 min-w-[180px]">Ket. Khusus / Berat</th>
                                        <th scope="col" className="py-3 px-4 text-center w-28">Status</th>
                                        <th scope="col" className="py-3 px-4 text-center w-24">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#ede9e1]/80 dark:divide-slate-800/80 text-xs">
                                    {paginatedMatches.length > 0 ? (
                                        paginatedMatches.map((mc, idx) => (
                                            <tr
                                                key={mc.id}
                                                className="hover:bg-[#fcfbf9] dark:hover:bg-slate-800/40 transition-colors group"
                                            >
                                                {/* Index */}
                                                <td className="py-3.5 px-4 text-center text-[#888] dark:text-slate-500 font-mono text-[11px] whitespace-nowrap">
                                                    {(matchPage - 1) * itemsPerPage + idx + 1}
                                                </td>

                                                {/* Match Name with Avatar */}
                                                <td className="py-3.5 px-4 font-medium text-[#0f0d0b] dark:text-white">
                                                    <div className="flex items-center gap-3">
                                                        <div
                                                            className="w-8 h-8 rounded-xl text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform"
                                                            style={{
                                                                background: mc.type === 'embu'
                                                                    ? 'linear-gradient(135deg, #4f46e5, #d4a843)'
                                                                    : 'linear-gradient(135deg, #c0392b, #b91c1c)',
                                                            }}
                                                        >
                                                            {mc.type === 'embu' ? 'EM' : 'RD'}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p
                                                                onClick={() => openEditMatchModal(mc)}
                                                                className="font-semibold text-slate-900 dark:text-white text-xs sm:text-sm group-hover:text-[#c0392b] dark:group-hover:text-[#f0c060] transition-colors cursor-pointer truncate"
                                                            >
                                                                {mc.name}
                                                            </p>
                                                            <p className="text-[10px] text-[#8c827a] dark:text-slate-400 font-mono mt-0.5 flex items-center gap-1">
                                                                <i className="fa-solid fa-hashtag text-[8px] opacity-70"></i>
                                                                <span>Urutan #{mc.order}</span>
                                                            </p>
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* Kelompok Umur */}
                                                <td className="py-3.5 px-4 whitespace-nowrap">
                                                    <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-[#f7f4ef] text-[#0f0d0b] text-xs font-semibold border border-[#ede9e1]">
                                                        {mc.age_category_name}
                                                    </span>
                                                </td>

                                                {/* Tipe */}
                                                <td className="py-3.5 px-4 whitespace-nowrap">
                                                    {mc.type === 'embu' ? (
                                                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200">
                                                            <i className="fa-solid fa-yin-yang text-[9px]"></i>
                                                            Embu
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-700 bg-red-50 px-2.5 py-0.5 rounded-full border border-red-200">
                                                            <i className="fa-solid fa-hand-fist text-[9px]"></i>
                                                            Randori
                                                        </span>
                                                    )}
                                                </td>

                                                {/* Gender */}
                                                <td className="py-3.5 px-4 whitespace-nowrap">
                                                    {mc.gender === 'male' && (
                                                        <span className="text-xs font-semibold text-blue-700 flex items-center gap-1">
                                                            <i className="fa-solid fa-mars"></i> Putra
                                                        </span>
                                                    )}
                                                    {mc.gender === 'female' && (
                                                        <span className="text-xs font-semibold text-rose-700 flex items-center gap-1">
                                                            <i className="fa-solid fa-venus"></i> Putri
                                                        </span>
                                                    )}
                                                    {mc.gender === 'mixed' && (
                                                        <span className="text-xs font-semibold text-purple-700 flex items-center gap-1">
                                                            <i className="fa-solid fa-venus-mars"></i> Campuran
                                                        </span>
                                                    )}
                                                </td>

                                                {/* Kuota Bagan */}
                                                <td className="py-3.5 px-4 text-center whitespace-nowrap font-mono font-bold text-[#0f0d0b]">
                                                    <span className="px-2 py-0.5 rounded-lg bg-[#f7f4ef] border border-[#ede9e1] text-xs">
                                                        {mc.capacity} Peserta
                                                    </span>
                                                </td>

                                                {/* Maksimum Atlet per Tim */}
                                                <td className="py-3.5 px-4 text-center whitespace-nowrap font-mono font-bold text-[#0f0d0b]">
                                                    <span className="px-2 py-0.5 rounded-lg bg-[#f7f4ef] border border-[#ede9e1] text-xs">
                                                        {mc.max_athletes_per_team} Atlet
                                                    </span>
                                                </td>

                                                {/* Keterangan Khusus / Berat / Kyu */}
                                                <td className="py-3.5 px-4 text-xs text-slate-600 dark:text-slate-400 whitespace-nowrap">
                                                    {mc.type === 'randori' ? (
                                                        <span className="font-mono font-medium text-slate-800">
                                                            Berat: {mc.weight_range}
                                                        </span>
                                                    ) : (
                                                        <span>
                                                            {mc.min_kyu || mc.max_kyu ? `${mc.min_kyu || ''} - ${mc.max_kyu || ''}` : '-'}
                                                        </span>
                                                    )}
                                                </td>

                                                {/* Status */}
                                                <td className="py-3.5 px-4 text-center whitespace-nowrap">
                                                    {mc.is_active ? (
                                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                                            Aktif
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                                                            Nonaktif
                                                        </span>
                                                    )}
                                                </td>

                                                {/* Actions */}
                                                <td className="py-3.5 px-4 text-center whitespace-nowrap">
                                                    <div className="flex items-center justify-center gap-1.5">
                                                        <Button variant="unstyled" size="none"
                                                            type="button"
                                                            onClick={() => openEditMatchModal(mc)}
                                                            className="w-8 h-8 rounded-xl border border-[#ede9e1] dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-[#c0392b] hover:text-white hover:border-[#c0392b] dark:hover:bg-[#c0392b] transition-all inline-flex items-center justify-center cursor-pointer shadow-xs hover:scale-105"
                                                            title="Edit Nomer Pertandingan"
                                                        >
                                                            <i className="fa-solid fa-pen-to-square text-xs"></i>
                                                        </Button>
                                                        <Button variant="unstyled" size="none"
                                                            type="button"
                                                            onClick={() => setDeletingMatchCategory(mc)}
                                                            className="w-8 h-8 rounded-xl border border-[#ede9e1] dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-300 transition-all inline-flex items-center justify-center cursor-pointer shadow-xs hover:scale-105"
                                                            title="Hapus Nomer Pertandingan"
                                                        >
                                                            <i className="fa-solid fa-trash-can text-xs"></i>
                                                        </Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={9} className="py-12 text-center text-[#b5afa6] italic text-xs">
                                                <i className="fa-solid fa-award text-3xl mb-2 block opacity-40"></i>
                                                Tidak ada nomer pertandingan yang sesuai dengan filter pencarian.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table></TableContainer>

                        {/* Table Footer with Pagination */}
                        {filteredMatches.length > 0 && (
                            <Pagination
                                currentPage={matchPage}
                                totalPages={Math.ceil(filteredMatches.length / itemsPerPage) || 1}
                                total={filteredMatches.length}
                                from={(matchPage - 1) * itemsPerPage + 1}
                                to={Math.min(matchPage * itemsPerPage, filteredMatches.length)}
                                onPageChange={(p) => setMatchPage(p)}
                                label="nomer pertandingan"
                                variant="footer"
                            />
                        )}
                    </div>
                )}

                {activeTab === 'tournament' && (
                    <div className="space-y-5">
                        <section className="rounded-2xl border border-[#ede9e1] bg-white p-5 shadow-xs md:p-6">
                            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-[.14em] text-[#a47420]">Alur pertandingan event</p>
                                    <h3 className="mt-1 font-cinzel text-lg font-bold text-[#17120f]">Pengaturan Drawing & Penjadwalan</h3>
                                    <p className="mt-1 max-w-2xl text-xs leading-relaxed text-[#8c827a]">Nilai ini dipakai saat precheck, pembentukan pool/bracket, dan penempatan partai pada sesi pertandingan event ini.</p>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    <Link href={`/admin/pertandingan/merge?event_id=${event.id}`} className="rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2 text-xs font-bold text-amber-800 hover:bg-amber-100"><i className="fa-solid fa-object-group mr-1.5" />Merge Nomor</Link>
                                    <Link href={`/admin/pertandingan/drawing?event_id=${event.id}`} className="rounded-xl bg-[#17120f] px-3.5 py-2 text-xs font-bold text-[#f0c060] hover:bg-black"><i className="fa-solid fa-wand-magic-sparkles mr-1.5" />Buka Drawing</Link>
                                </div>
                            </div>

                            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                                {[
                                    ['Status alur', tournamentSummary.status === 'completed' ? 'Selesai' : tournamentSummary.status === 'in_progress' ? 'Berlangsung' : tournamentSummary.status === 'published' ? 'Dipublikasikan' : tournamentSummary.status === 'generated' ? 'Sudah dibuat' : 'Draft', 'fa-flag'],
                                    ['Kategori dibuat', tournamentSummary.generated_categories, 'fa-diagram-project'],
                                    ['Perlu merge', tournamentSummary.skipped_categories, 'fa-object-group'],
                                    ['Node / sesi tanding', `${tournamentSummary.total_matches} / ${tournamentSummary.match_sessions}`, 'fa-calendar-check'],
                                ].map(([label, value, icon]) => <div key={label} className="rounded-xl border border-[#eee8e0] bg-[#faf8f4] p-4"><div className="flex items-center justify-between"><p className="text-[11px] font-semibold text-[#746b63]">{label}</p><i className={`fa-solid ${icon} text-[#c0392b]`} /></div><p className="mt-2 text-xl font-bold text-[#17120f]">{value}</p></div>)}
                            </div>
                        </section>

                        <form onSubmit={submitTournamentSettings} className="overflow-hidden rounded-2xl border border-[#ede9e1] bg-white shadow-xs">
                            <div className="flex flex-col gap-3 border-b border-[#ede9e1] p-5 md:flex-row md:items-center md:justify-between md:px-6">
                                <div><h3 className="font-cinzel text-base font-bold uppercase text-[#17120f]">Aturan Generate Pertandingan</h3><p className="mt-1 text-xs text-[#8c827a]">Berlaku hanya untuk event ini dan dapat diubah sebelum drawing dipublikasikan.</p></div>
                                <Button variant="unstyled" size="none" type="submit" disabled={tournamentForm.processing} className="rounded-xl bg-gradient-to-r from-[#c0392b] to-[#96281b] px-4 py-2.5 text-xs font-bold text-white shadow-sm disabled:opacity-50"><i className={`fa-solid ${tournamentForm.processing ? 'fa-spinner animate-spin' : 'fa-check'} mr-1.5`} />{tournamentForm.processing ? 'Menyimpan...' : 'Simpan Pengaturan'}</Button>
                            </div>
                            <div className="grid gap-4 p-5 md:grid-cols-2 md:p-6 xl:grid-cols-4">
                                <Input label="Durasi Satu Partai (menit)" type="number" min="1" required value={tournamentForm.data.match_duration_minutes} onChange={(e) => tournamentForm.setData('match_duration_minutes', e.target.value)} error={tournamentForm.errors.match_duration_minutes} />
                                <Input label="Jeda Minimal Atlet (menit)" type="number" min="0" required value={tournamentForm.data.minimum_rest_minutes} onChange={(e) => tournamentForm.setData('minimum_rest_minutes', e.target.value)} error={tournamentForm.errors.minimum_rest_minutes} />
                                <Input label="Minimal Peserta / Tim" type="number" min="1" required value={tournamentForm.data.minimum_entries_per_category} onChange={(e) => tournamentForm.setData('minimum_entries_per_category', e.target.value)} error={tournamentForm.errors.minimum_entries_per_category} />
                                <Input label="Minimal Kontingen" type="number" min="1" required value={tournamentForm.data.minimum_contingents_per_category} onChange={(e) => tournamentForm.setData('minimum_contingents_per_category', e.target.value)} error={tournamentForm.errors.minimum_contingents_per_category} />
                            </div>
                            <div className="grid gap-3 border-t border-[#ede9e1] bg-[#faf8f4] p-5 text-xs text-[#5f574f] md:grid-cols-4 md:px-6">
                                {[
                                    ['1', 'Precheck', 'Registrasi dan pembayaran terverifikasi.'],
                                    ['2', 'Drawing', 'Antar-kontingen diselingi, Embu dibuat pool, Randori dibuat bracket.'],
                                    ['3', 'Jadwal', 'Penyisihan lebih dulu, final setelah jeda minimal.'],
                                    ['4', 'Publikasi', 'Bagan dikunci setelah diperiksa admin event.'],
                                ].map(([number, title, description]) => <div key={number} className="flex gap-2.5"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#17120f] font-bold text-[#f0c060]">{number}</span><div><p className="font-bold text-[#17120f]">{title}</p><p className="mt-0.5 leading-relaxed text-[#8c827a]">{description}</p></div></div>)}
                            </div>
                        </form>
                    </div>
                )}

                {/* ════ TAB 4: SESI ACARA & RUNDOWN (DASHBOARD STYLE) ════ */}
                {activeTab === 'rundown' && (
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-[#ede9e1] dark:border-slate-800 shadow-xs overflow-hidden">
                        {/* Table Header / Toolbar */}
                        <div className="p-5 md:px-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                                <div className="flex items-center gap-3">
                                    <h3 className="font-cinzel text-base md:text-lg font-bold text-[#0f0d0b] dark:text-white tracking-wide uppercase">
                                        Sesi Acara & Rundown
                                    </h3>
                                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#c0392b]/10 text-[#c0392b] dark:bg-[#c0392b]/20 dark:text-[#f0c060] border border-[#c0392b]/20">
                                        {rundowns.length} Total
                                    </span>
                                </div>
                                <p className="text-xs text-[#b5afa6] dark:text-slate-400 mt-1">
                                    Jadwal kronologis pelaksanaan kegiatan kejuaraan dari upacara pembukaan hingga babak final
                                </p>
                            </div>

                            <div className="flex items-center gap-2.5 flex-wrap">
                                {/* Search Input Bar */}
                                <Input type="search" size="sm" value={rundownSearch} onChange={(event) => {
                                    setRundownSearch(event.target.value);
                                    setRundownPage(1);
                                }} placeholder="Cari sesi rundown..." iconLeft={<i className="fa-solid fa-magnifying-glass" aria-hidden="true" />}
                                    clearable onClear={() => { setRundownSearch(''); setRundownPage(1); }} containerClassName="w-56 sm:w-64" />

                                <Button variant="unstyled" size="none"
                                    type="button"
                                    onClick={openCreateRundownModal}
                                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-[#c0392b] to-[#96281b] hover:from-[#a93226] hover:to-[#7b1f14] shadow-xs hover:shadow-md transition-all cursor-pointer shrink-0"
                                    title="Tambah Sesi Rundown"
                                >
                                    <i className="fa-solid fa-plus text-xs"></i>
                                    <span>Tambah Sesi Rundown</span>
                                </Button>
                            </div>
                        </div>

                        {/* Table Content */}
                        <TableContainer ariaLabel="Tabel data">
                            <table className="responsive-data-table whitespace-nowrap w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-[#f7f4ef] dark:bg-slate-800/70 border-y border-[#ede9e1] dark:border-slate-800 text-[10px] uppercase font-semibold text-[#8c827a] dark:text-slate-400 tracking-wider whitespace-nowrap">
                                        <th scope="col" className="py-3 px-4 text-center w-14">#</th>
                                        <th scope="col" className="py-3 px-4 min-w-[200px]">Waktu Pelaksanaan</th>
                                        <th scope="col" className="py-3 px-4 min-w-[240px]">Nama Sesi Acara</th>
                                        <th scope="col" className="py-3 px-4 min-w-[160px]">Kategori / Tipe</th>
                                        <th scope="col" className="py-3 px-4 min-w-[240px]">Deskripsi / Lokasi</th>
                                        <th scope="col" className="py-3 px-4 text-center w-24">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#ede9e1]/80 dark:divide-slate-800/80 text-xs">
                                    {paginatedRundowns.length > 0 ? (
                                        paginatedRundowns.map((rd, idx) => (
                                            <tr
                                                key={rd.id}
                                                className="hover:bg-[#fcfbf9] dark:hover:bg-slate-800/40 transition-colors group"
                                            >
                                                {/* Index */}
                                                <td className="py-3.5 px-4 text-center text-[#888] dark:text-slate-500 font-mono text-[11px] whitespace-nowrap">
                                                    {(rundownPage - 1) * itemsPerPage + idx + 1}
                                                </td>

                                                {/* Waktu */}
                                                <td className="py-3.5 px-4 font-medium text-slate-800 whitespace-nowrap">
                                                    <div className="flex items-center gap-2">
                                                        <i className="fa-regular fa-clock text-[#c0392b] text-xs"></i>
                                                        <span className="font-mono text-xs">{rd.date_formatted}{rd.end_time_only ? `–${rd.end_time_only}` : ''}</span>
                                                    </div>
                                                </td>

                                                {/* Nama Sesi with Avatar */}
                                                <td className="py-3.5 px-4 font-medium text-[#0f0d0b] dark:text-white">
                                                    <div className="flex items-center gap-3">
                                                        <div
                                                            className="w-8 h-8 rounded-xl text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform"
                                                            style={{
                                                                background: 'linear-gradient(135deg, #c0392b, #d4a843)',
                                                            }}
                                                        >
                                                            <i className="fa-solid fa-calendar-check text-xs"></i>
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p
                                                                onClick={() => openEditRundownModal(rd)}
                                                                className="font-semibold text-slate-900 dark:text-white text-xs sm:text-sm group-hover:text-[#c0392b] transition-colors cursor-pointer truncate"
                                                            >
                                                                {rd.name}
                                                            </p>
                                                            <p className="text-[10px] text-[#8c827a] font-mono mt-0.5 flex items-center gap-1">
                                                                <i className="fa-solid fa-hashtag text-[8px] opacity-70"></i>
                                                                <span>Sesi #{rd.order}</span>
                                                            </p>
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* Tipe / Kategori */}
                                                <td className="py-3.5 px-4 whitespace-nowrap">
                                                    <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-[#f7f4ef] text-[#0f0d0b] text-xs font-semibold border border-[#ede9e1]">
                                                        {rd.type}
                                                    </span>
                                                    {rd.is_match_session && <span className="ml-1.5 inline-flex items-center rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700">Sesi Pertandingan</span>}
                                                </td>

                                                {/* Deskripsi */}
                                                <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400 text-xs">
                                                    <span className="truncate block max-w-xs">{rd.description || '-'}</span>
                                                </td>

                                                {/* Aksi */}
                                                <td className="py-3.5 px-4 text-center whitespace-nowrap">
                                                    <div className="flex items-center justify-center gap-1.5">
                                                        <Button variant="unstyled" size="none"
                                                            type="button"
                                                            onClick={() => openEditRundownModal(rd)}
                                                            className="w-8 h-8 rounded-xl border border-[#ede9e1] bg-white text-slate-600 hover:bg-[#c0392b] hover:text-white hover:border-[#c0392b] transition-all inline-flex items-center justify-center cursor-pointer shadow-xs hover:scale-105"
                                                            title="Edit Sesi Rundown"
                                                        >
                                                            <i className="fa-solid fa-pen-to-square text-xs"></i>
                                                        </Button>
                                                        <Button variant="unstyled" size="none"
                                                            type="button"
                                                            onClick={() => setDeletingRundown(rd)}
                                                            className="w-8 h-8 rounded-xl border border-[#ede9e1] bg-white text-slate-600 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-300 transition-all inline-flex items-center justify-center cursor-pointer shadow-xs hover:scale-105"
                                                            title="Hapus Sesi Rundown"
                                                        >
                                                            <i className="fa-solid fa-trash-can text-xs"></i>
                                                        </Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={6} className="py-12 text-center text-[#b5afa6] italic text-xs">
                                                <i className="fa-solid fa-clock-rotate-left text-3xl mb-2 block opacity-40"></i>
                                                Belum ada data sesi rundown yang sesuai.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table></TableContainer>

                        {/* Table Footer with Pagination Controls */}
                        {filteredRundowns.length > 0 && (
                            <Pagination
                                currentPage={rundownPage}
                                totalPages={Math.ceil(filteredRundowns.length / itemsPerPage) || 1}
                                total={filteredRundowns.length}
                                from={(rundownPage - 1) * itemsPerPage + 1}
                                to={Math.min(rundownPage * itemsPerPage, filteredRundowns.length)}
                                onPageChange={(p) => setRundownPage(p)}
                                label="sesi acara"
                                variant="footer"
                            />
                        )}
                    </div>
                )}

                {/* ════ TAB 5: INFORMASI EVENT (DASHBOARD STYLE) ════ */}
                {activeTab === 'info' && (
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-[#ede9e1] dark:border-slate-800 shadow-xs overflow-hidden">
                        <div className="grid gap-5 border-b border-[#ede9e1] p-5 md:grid-cols-[240px_1fr] md:p-6">
                            <div className="relative aspect-[16/10] overflow-hidden rounded-2xl border border-[#ded8ce] bg-[#17120f]">
                                {event.cover_image_url ? (
                                    <img src={event.cover_image_url} alt={`Gambar utama ${event.name}`} className="h-full w-full object-cover" />
                                ) : (
                                    <div className="flex h-full flex-col items-center justify-center bg-[radial-gradient(circle_at_top,#4a231a_0%,#17120f_65%)] px-5 text-center text-white">
                                        <span className="font-cinzel text-4xl font-black text-[#d4a843]/30" aria-hidden="true">拳</span>
                                        <span className="mt-2 text-xs font-bold uppercase tracking-[0.18em] text-[#f0c060]">No Image</span>
                                        <span className="mt-1 text-[10px] text-white/55">Gunakan JPG, PNG, atau WebP</span>
                                    </div>
                                )}
                            </div>
                            <form onSubmit={submitCoverImage} className="flex flex-col justify-center">
                                <h3 className="font-cinzel text-base font-bold text-[#17120f] dark:text-white">Gambar Utama Event</h3>
                                <p className="mt-1 text-xs leading-relaxed text-[#706860] dark:text-slate-400">
                                    Opsional. Gambar digunakan pada landing event dan beranda bila event dipilih sebagai landing utama. Maksimal 5 MB.
                                </p>
                                <input
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp"
                                    onChange={(e) => coverForm.setData('cover_image', e.target.files?.[0] || null)}
                                    className="mt-4 block w-full rounded-xl border border-[#ded8ce] bg-[#faf8f5] px-3 py-2 text-xs text-[#504840] file:mr-3 file:rounded-lg file:border-0 file:bg-[#17120f] file:px-3 file:py-2 file:text-xs file:font-semibold file:text-[#f0c060]"
                                />
                                {coverForm.errors.cover_image && <p className="mt-1.5 text-xs font-medium text-rose-600">{coverForm.errors.cover_image}</p>}
                                <div className="mt-3 flex flex-wrap gap-2">
                                    <Button variant="unstyled" size="none" type="submit" disabled={!coverForm.data.cover_image || coverForm.processing}
                                        className="inline-flex items-center gap-2 rounded-xl bg-[#c0392b] px-4 py-2 text-xs font-semibold text-white hover:bg-[#a93226] disabled:cursor-not-allowed disabled:opacity-50">
                                        <i className="fa-solid fa-cloud-arrow-up"></i>
                                        {coverForm.processing ? 'Mengunggah...' : 'Unggah Gambar'}
                                    </Button>
                                    {event.cover_image_url && (
                                        <Button variant="unstyled" size="none" type="button" onClick={removeCoverImage}
                                            className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-white px-4 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50">
                                            <i className="fa-solid fa-trash-can"></i>
                                            Hapus Gambar
                                        </Button>
                                    )}
                                </div>
                            </form>
                        </div>
                        <form onSubmit={submitGeneral}>
                            <div className="p-5 md:px-6 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#ede9e1]">
                                <div>
                                    <div className="flex items-center gap-3">
                                        <h3 className="font-cinzel text-base md:text-lg font-bold text-[#0f0d0b] dark:text-white tracking-wide uppercase">
                                            Informasi Umum Kejuaraan
                                        </h3>
                                    </div>
                                    <p className="text-xs text-[#b5afa6] dark:text-slate-400 mt-1">
                                        Perbarui nama acara, edisi, lokasi venue, penyelenggara, dan kontak narahubung
                                    </p>
                                    {event.updated_at_formatted && (
                                        <p className="mt-1 text-xs text-[#706860] dark:text-slate-400">
                                            Terakhir tersimpan: {event.updated_at_formatted} WIB
                                        </p>
                                    )}
                                </div>
                                <Button variant="unstyled" size="none"
                                    type="submit"
                                    disabled={generalForm.processing}
                                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-[#c0392b] to-[#96281b] hover:from-[#a93226] hover:to-[#7b1f14] shadow-xs hover:shadow-md transition-all cursor-pointer shrink-0"
                                >
                                    <i className="fa-solid fa-check text-xs"></i>
                                    <span>{generalForm.processing ? 'Menyimpan...' : 'Simpan Informasi Event'}</span>
                                </Button>
                            </div>

                            {generalSaveFeedback && (
                                <div
                                    role={generalSaveFeedback.type === 'error' ? 'alert' : 'status'}
                                    className={`mx-5 mt-5 rounded-xl border px-4 py-3 text-sm font-medium md:mx-6 ${generalSaveFeedback.type === 'success'
                                        ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200'
                                        : 'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-200'}`}
                                >
                                    {generalSaveFeedback.message}
                                </div>
                            )}

                            <div className="p-6 md:p-8 space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <Input
                                        label="Nama Event / Kejuaraan"
                                        required
                                        value={generalForm.data.name}
                                        onChange={(e) => generalForm.setData('name', e.target.value)}
                                        error={generalForm.errors.name}
                                        placeholder="e.g. Kejurda Shorinji Kempo Jawa Timur"
                                    />

                                    <Input
                                        label="Edisi Kejuaraan"
                                        value={generalForm.data.edition}
                                        onChange={(e) => generalForm.setData('edition', e.target.value)}
                                        error={generalForm.errors.edition}
                                        placeholder="e.g. Edisi Ke-XVIII 2026"
                                    />

                                    <Input
                                        label="Maks. Nomor Pertandingan per Atlet"
                                        type="number"
                                        min="1"
                                        max="20"
                                        required
                                        value={generalForm.data.max_match_categories_per_athlete}
                                        onChange={(e) => generalForm.setData('max_match_categories_per_athlete', e.target.value)}
                                        error={generalForm.errors.max_match_categories_per_athlete}
                                        hint="Minimal 1. Contoh: 3 berarti setiap atlet dapat mengikuti maksimal 3 nomor pertandingan pada event ini."
                                    />

                                    <Checkbox id="allow-cross-age-group-embu" checked={generalForm.data.allow_cross_age_group_embu}
                                        onChange={(event) => generalForm.setData('allow_cross_age_group_embu', event.target.checked)}
                                        label="Izinkan Gabung Kelompok Usia Lain"
                                        description="Atlet dapat memilih satu kelompok usia tujuan yang lebih tua untuk nomor Embu. Kelompok usia asal tetap tersimpan."
                                        className="rounded-xl border border-[#ede9e1] bg-[#fbf9f5] p-4" />

                                    <Input
                                        label="Penyelenggara / Panitia Pelaksana"
                                        value={generalForm.data.organizer}
                                        onChange={(e) => generalForm.setData('organizer', e.target.value)}
                                        error={generalForm.errors.organizer}
                                        placeholder="e.g. Pengprov Perkemi Jawa Timur"
                                    />

                                    <div className="md:col-span-2 space-y-4">
                                        <Input
                                            label="Slug Akses Event (URL)"
                                            required
                                            value={generalForm.data.slug}
                                            onChange={(e) => generalForm.setData('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                                            error={generalForm.errors.slug}
                                            placeholder="e.g. kejurda-jatim-2026"
                                            hint="Digunakan sebagai URL resmi halaman publik dan akses panel panitia event."
                                        />

                                        {/* Widget Akses Link Event */}
                                        <div className="rounded-xl border border-[#d4a843]/30 bg-gradient-to-br from-[#faf8f5] to-[#f4eee3] dark:from-[#181614] dark:to-[#11100e] p-4">
                                            <div className="flex items-center gap-2 mb-3 text-xs font-bold uppercase tracking-wider text-[#d4a843]">
                                                <i className="fa-solid fa-link"></i>
                                                <span>Tautan Akses Event Berbasis Slug</span>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                {/* Public URL */}
                                                <div className="p-3 rounded-lg bg-white dark:bg-black/20 border border-black/5 dark:border-white/5 flex flex-col justify-between gap-2">
                                                    <div>
                                                        <span className="text-[11px] font-bold text-[#706860] dark:text-slate-400 block">
                                                            Halaman Publik & Pendaftaran
                                                        </span>
                                                        <span className="text-xs font-mono font-semibold text-[#c0392b] break-all block mt-0.5">
                                                            {typeof window !== 'undefined' ? `${window.location.origin}/event/${generalForm.data.slug || event.slug}` : `/event/${generalForm.data.slug || event.slug}`}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-2 pt-1 border-t border-black/5 dark:border-white/5">
                                                        <Button variant="unstyled" size="none"
                                                            type="button"
                                                            onClick={() => handleCopyUrl(`${window.location.origin}/event/${generalForm.data.slug || event.slug}`, 'public')}
                                                            className="text-xs font-semibold text-[#706860] hover:text-[#141210] dark:text-slate-300 dark:hover:text-white flex items-center gap-1 cursor-pointer"
                                                        >
                                                            <i className="fa-regular fa-copy text-[11px]"></i>
                                                            <span>{copiedUrlType === 'public' ? 'Tersalin!' : 'Salin'}</span>
                                                        </Button>
                                                        <span className="text-gray-300">&middot;</span>
                                                        <a
                                                            href={`/event/${generalForm.data.slug || event.slug}`}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="text-xs font-semibold text-[#c0392b] hover:underline flex items-center gap-1"
                                                        >
                                                            <span>Buka Publik</span>
                                                            <i className="fa-solid fa-arrow-up-right-from-square text-[9px]"></i>
                                                        </a>
                                                    </div>
                                                </div>

                                                {/* Admin Tenant URL */}
                                                <div className="p-3 rounded-lg bg-white dark:bg-black/20 border border-black/5 dark:border-white/5 flex flex-col justify-between gap-2">
                                                    <div>
                                                        <span className="text-[11px] font-bold text-[#706860] dark:text-slate-400 block">
                                                            Panel Panitia / Admin Event
                                                        </span>
                                                        <span className="text-xs font-mono font-semibold text-[#d4a843] break-all block mt-0.5">
                                                            {typeof window !== 'undefined' ? `${window.location.origin}/event/${generalForm.data.slug || event.slug}/admin` : `/event/${generalForm.data.slug || event.slug}/admin`}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-2 pt-1 border-t border-black/5 dark:border-white/5">
                                                        <Button variant="unstyled" size="none"
                                                            type="button"
                                                            onClick={() => handleCopyUrl(`${window.location.origin}/event/${generalForm.data.slug || event.slug}/admin`, 'admin')}
                                                            className="text-xs font-semibold text-[#706860] hover:text-[#141210] dark:text-slate-300 dark:hover:text-white flex items-center gap-1 cursor-pointer"
                                                        >
                                                            <i className="fa-regular fa-copy text-[11px]"></i>
                                                            <span>{copiedUrlType === 'admin' ? 'Tersalin!' : 'Salin'}</span>
                                                        </Button>
                                                        <span className="text-gray-300">&middot;</span>
                                                        <a
                                                            href={`/event/${generalForm.data.slug || event.slug}/admin`}
                                                            className="text-xs font-semibold text-[#d4a843] hover:underline flex items-center gap-1"
                                                        >
                                                            <span>Masuk Panel</span>
                                                            <i className="fa-solid fa-arrow-right text-[9px]"></i>
                                                        </a>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <Combobox
                                        label="Status Publikasi Event"
                                        required
                                        value={generalForm.data.status}
                                        onChange={(val) => generalForm.setData('status', val)}
                                        options={statusOptions}
                                        clearable={false}
                                        error={generalForm.errors.status}
                                    />

                                    <Input
                                        label="Nama Gedung / Gelanggang (Venue)"
                                        required
                                        value={generalForm.data.venue}
                                        onChange={(e) => generalForm.setData('venue', e.target.value)}
                                        error={generalForm.errors.venue}
                                        placeholder="e.g. GOR Kertajaya Surabaya"
                                    />

                                    <div className="grid grid-cols-2 gap-3">
                                        <Input
                                            label="Kota Pelaksanaan"
                                            required
                                            value={generalForm.data.city}
                                            onChange={(e) => generalForm.setData('city', e.target.value)}
                                            error={generalForm.errors.city}
                                            placeholder="e.g. Surabaya"
                                        />
                                        <Input
                                            label="Provinsi"
                                            value={generalForm.data.province}
                                            onChange={(e) => generalForm.setData('province', e.target.value)}
                                            error={generalForm.errors.province}
                                            placeholder="e.g. Jawa Timur"
                                        />
                                    </div>

                                    <Input
                                        label="Narahubung (Contact Person)"
                                        value={generalForm.data.contact_person}
                                        onChange={(e) => generalForm.setData('contact_person', e.target.value)}
                                        error={generalForm.errors.contact_person}
                                        placeholder="e.g. Sensei Bambang Supriyadi"
                                    />

                                    <Input
                                        label="Nomor WhatsApp Narahubung"
                                        value={generalForm.data.contact_phone}
                                        onChange={(e) => generalForm.setData('contact_phone', e.target.value)}
                                        error={generalForm.errors.contact_phone}
                                        placeholder="e.g. 0812-3456-7890"
                                    />
                                </div>

                                <Textarea
                                    label="Deskripsi & Petunjuk Teknis Acara"
                                    rows={4}
                                    value={generalForm.data.description}
                                    onChange={(e) => generalForm.setData('description', e.target.value)}
                                    error={generalForm.errors.description}
                                    placeholder="Tuliskan gambaran umum kejuaraan, tata tertib, atau informasi penting lainnya..."
                                />

                                <Checkbox id="is_active_toggle" checked={generalForm.data.is_active}
                                    onChange={(event) => generalForm.setData('is_active', event.target.checked)}
                                    label="Aktifkan Event untuk Operasional"
                                    description="Event aktif tersedia di menu registrasi dan pertandingan. Event aktif lain tetap berjalan secara terpisah."
                                    className="rounded-xl border border-[#ede9e1] bg-[#fbf9f5] p-4" />

                                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#ede9e1] pt-5">
                                    <p className="text-xs text-[#706860] dark:text-slate-400">
                                        Tombol ini menyimpan seluruh kolom Informasi Umum Kejuaraan di atas.
                                    </p>
                                    <Button variant="unstyled" size="none" type="submit" disabled={generalForm.processing} className="rounded-xl bg-[#a93226] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#8f281e] disabled:cursor-not-allowed disabled:opacity-60">
                                        {generalForm.processing ? 'Menyimpan...' : 'Simpan Informasi Event'}
                                    </Button>
                                </div>

                                <div className="rounded-2xl border border-[#ede9e1] bg-white p-5 dark:border-slate-800 dark:bg-slate-950">
                                    <div className="flex items-start gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-700"><i className="fa-solid fa-user-shield" /></span><div><h4 className="text-sm font-bold text-[#141210] dark:text-white">Penanggung Jawab & Akses Event</h4><p className="mt-0.5 text-xs text-[#706860] dark:text-slate-400">Satu event dapat memiliki beberapa penanggung jawab. Akun dengan akses Penanggung Jawab Event hanya mengelola event yang ditugaskan melalui URL panel event (/event/{'{slug}'}/admin), bukan sebagai Admin global.</p></div></div>
                                    <p className="mt-3 text-xs text-[#706860] dark:text-slate-400">Tambahkan seluruh penanggung jawab dan petugas event, kemudian simpan daftar akses di bawah ini.</p>
                                    <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_230px_auto] md:items-end"><Combobox label="Pengguna" value={selectedEventUserId} onChange={setSelectedEventUserId} options={userOptions.filter((user) => !accessForm.data.users.some((eventUser) => eventUser.id === user.value))} placeholder="Pilih pengguna..." /><Combobox label="Hak Akses" value={selectedEventUserRole} onChange={setSelectedEventUserRole} options={eventAccessRoleOptions} clearable={false} /><Button type="button" onClick={addEventUser} disabled={!selectedEventUserId}><i className="fa-solid fa-plus mr-2" />Tambahkan</Button></div>
                                    <div className="mt-4 divide-y divide-[#ede9e1] rounded-xl border border-[#ede9e1] dark:divide-slate-800 dark:border-slate-800">{accessForm.data.users.length ? accessForm.data.users.map((user) => <div key={user.id} className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-semibold text-[#141210] dark:text-white">{user.name}</p><p className="text-xs text-[#706860] dark:text-slate-400">{user.email}</p></div><div className="flex items-center gap-2"><div className="w-56"><Combobox value={user.access_role} onChange={(value) => accessForm.setData('users', accessForm.data.users.map((item) => item.id === user.id ? { ...item, access_role: value } : item))} options={eventAccessRoleOptions} clearable={false} size="sm" /></div><Button variant="unstyled" size="none" type="button" onClick={() => accessForm.setData('users', accessForm.data.users.filter((item) => item.id !== user.id))} className="rounded-lg p-2 text-red-600 hover:bg-red-50" aria-label={`Hapus akses ${user.name}`}><i className="fa-solid fa-trash" /></Button></div></div>) : <p className="p-4 text-sm text-[#706860]">Belum ada penanggung jawab atau pengguna khusus untuk event ini.</p>}</div>
                                    {accessForm.errors.users && <p className="mt-2 text-xs font-medium text-rose-500">{accessForm.errors.users}</p>}
                                    {accessSaveFeedback && <p role={accessSaveFeedback.type === 'error' ? 'alert' : 'status'} className={`mt-3 rounded-lg px-3 py-2 text-xs font-semibold ${accessSaveFeedback.type === 'success' ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'}`}>{accessSaveFeedback.message}</p>}
                                    <div className="mt-4 flex justify-end"><Button type="button" onClick={submitEventUsers} loading={accessForm.processing}><i className="fa-solid fa-user-check mr-2" />Simpan Penanggung Jawab & Akses</Button></div>
                                </div>
                            </div>
                        </form>
                    </div>
                )}

                {/* ════ TAB 6: TANGGAL ACARA (DASHBOARD STYLE) ════ */}
                {activeTab === 'dates' && (
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-[#ede9e1] dark:border-slate-800 shadow-xs overflow-hidden">
                        <form onSubmit={submitDates}>
                            <div className="p-5 md:px-6 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#ede9e1]">
                                <div>
                                    <div className="flex items-center gap-3">
                                        <h3 className="font-cinzel text-base md:text-lg font-bold text-[#0f0d0b] dark:text-white tracking-wide uppercase">
                                            Jadwal Tanggal Acara & Pendaftaran
                                        </h3>
                                    </div>
                                    <p className="text-xs text-[#b5afa6] dark:text-slate-400 mt-1">
                                        Atur periode pelaksanaan kejuaraan dan tenggat waktu pendaftaran atlet oleh kontingen
                                    </p>
                                </div>
                                <Button variant="unstyled" size="none"
                                    type="submit"
                                    disabled={datesForm.processing}
                                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-[#c0392b] to-[#96281b] hover:from-[#a93226] hover:to-[#7b1f14] shadow-xs hover:shadow-md transition-all cursor-pointer shrink-0"
                                >
                                    <i className="fa-solid fa-check text-xs"></i>
                                    <span>Simpan Jadwal Acara</span>
                                </Button>
                            </div>

                            <div className="p-6 md:p-8 space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Jadwal Pertandingan */}
                                    <div className="bg-[#fbf9f5] p-5 rounded-2xl border border-[#ede9e1] space-y-4">
                                        <h4 className="text-sm font-bold text-[#141210] flex items-center gap-2">
                                            <i className="fa-solid fa-trophy text-[#c0392b]"></i>
                                            Jadwal Hari Pertandingan
                                        </h4>
                                        <Input
                                            label="Tanggal Mulai Pertandingan"
                                            type="date"
                                            required
                                            value={datesForm.data.start_date}
                                            onChange={(e) => datesForm.setData('start_date', e.target.value)}
                                            error={datesForm.errors.start_date}
                                        />
                                        <Input
                                            label="Tanggal Selesai Pertandingan"
                                            type="date"
                                            required
                                            value={datesForm.data.end_date}
                                            onChange={(e) => datesForm.setData('end_date', e.target.value)}
                                            error={datesForm.errors.end_date}
                                        />
                                    </div>

                                    {/* Jadwal Registrasi */}
                                    <div className="bg-[#fbf9f5] p-5 rounded-2xl border border-[#ede9e1] space-y-4">
                                        <h4 className="text-sm font-bold text-[#141210] flex items-center gap-2">
                                            <i className="fa-solid fa-user-plus text-emerald-600"></i>
                                            Jadwal Pembukaan Pendaftaran
                                        </h4>
                                        <Input
                                            label="Tanggal Buka Pendaftaran"
                                            type="date"
                                            value={datesForm.data.registration_start}
                                            onChange={(e) => datesForm.setData('registration_start', e.target.value)}
                                            error={datesForm.errors.registration_start}
                                        />
                                        <Input
                                            label="Batas Akhir Pendaftaran (Deadline)"
                                            type="date"
                                            value={datesForm.data.registration_end}
                                            onChange={(e) => datesForm.setData('registration_end', e.target.value)}
                                            error={datesForm.errors.registration_end}
                                        />
                                    </div>
                                </div>
                            </div>
                        </form>
                    </div>
                )}

                {/* ════ TAB 7: KOORDINATOR LAPANGAN ════ */}
                {activeTab === 'field_coordinators' && (
                    <div className="overflow-hidden rounded-2xl border border-[#ede9e1] bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900"><div className="flex flex-col gap-4 border-b border-[#ede9e1] p-5 md:flex-row md:items-center md:justify-between dark:border-slate-800"><div><h3 className="text-base font-bold text-[#0f0d0b] dark:text-white">Koordinator Lapangan Event</h3><p className="mt-1 text-xs text-[#706860] dark:text-slate-400">Tentukan koordinator utama, court, logistik, dan liaison event.</p></div><Button type="button" onClick={() => setIsNewFieldCoordinatorModalOpen(true)} className="bg-[#141210] text-amber-400 hover:bg-black"><i className="fa-solid fa-user-plus mr-2" />Tambah Koordinator Baru</Button></div><div className="border-b border-[#ede9e1] bg-[#fcfbf9] p-5 dark:border-slate-800 dark:bg-slate-950/40"><form onSubmit={submitFieldCoordinatorAssignment} className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px_auto] md:items-end"><Combobox label="Pilih dari Master Koordinator" value={fieldCoordinatorAssignmentForm.data.field_coordinator_id} onChange={(value) => fieldCoordinatorAssignmentForm.setData('field_coordinator_id', value)} options={fieldCoordinatorOptions} placeholder="Cari koordinator..." error={fieldCoordinatorAssignmentForm.errors.field_coordinator_id} /><Combobox label="Area Penugasan" value={fieldCoordinatorAssignmentForm.data.assignment_area} onChange={(value) => fieldCoordinatorAssignmentForm.setData('assignment_area', value)} options={fieldCoordinatorAreaOptions} clearable={false} error={fieldCoordinatorAssignmentForm.errors.assignment_area} /><Button type="submit" loading={fieldCoordinatorAssignmentForm.processing} disabled={!fieldCoordinatorAssignmentForm.data.field_coordinator_id}><i className="fa-solid fa-plus mr-2" />Tugaskan</Button></form></div>{eventFieldCoordinators.length ? <div className="divide-y divide-[#ede9e1] dark:divide-slate-800">{eventFieldCoordinators.map((coordinator) => <div key={coordinator.id} className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-full bg-lime-50 text-lime-700"><i className="fa-solid fa-people-group" /></span><div><p className="font-semibold text-[#141210] dark:text-white">{coordinator.name}</p><p className="text-xs text-[#706860] dark:text-slate-400">{[coordinator.coordinator_number, coordinator.region].filter(Boolean).join(' · ') || 'Profil koordinator'}</p></div></div><div className="flex items-center gap-2"><span className="rounded-full bg-lime-50 px-2.5 py-1 text-xs font-semibold text-lime-700">{fieldCoordinatorAreaOptions.find((option) => option.value === coordinator.assignment_area)?.label || coordinator.assignment_area}</span><Button variant="unstyled" size="none" type="button" onClick={() => removeEventFieldCoordinator(coordinator)} className="rounded-lg p-2 text-red-600 hover:bg-red-50" aria-label={`Hapus ${coordinator.name} dari event`}><i className="fa-solid fa-trash" /></Button></div></div>)}</div> : <div className="p-8 text-center"><i className="fa-solid fa-people-group text-3xl text-[#d8d0c7]" /><p className="mt-3 font-semibold text-[#141210] dark:text-white">Belum ada koordinator yang ditugaskan</p></div>}</div>
                )}

                {/* ════ TAB 8: PANITERA ════ */}
                {activeTab === 'clerks' && (
                    <div className="overflow-hidden rounded-2xl border border-[#ede9e1] bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
                        <div className="flex flex-col gap-4 border-b border-[#ede9e1] p-5 md:flex-row md:items-center md:justify-between dark:border-slate-800"><div><h3 className="text-base font-bold text-[#0f0d0b] dark:text-white">Penugasan Panitera</h3><p className="mt-1 text-xs text-[#706860] dark:text-slate-400">Atur perangkat meja, pencatat nilai, waktu, dan operator event.</p></div><Button type="button" onClick={() => setIsNewClerkModalOpen(true)} className="bg-[#141210] text-amber-400 hover:bg-black"><i className="fa-solid fa-user-plus mr-2" />Tambah Panitera Baru</Button></div>
                        <div className="border-b border-[#ede9e1] bg-[#fcfbf9] p-5 dark:border-slate-800 dark:bg-slate-950/40"><form onSubmit={submitClerkAssignment} className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px_auto] md:items-end"><Combobox label="Pilih dari Master Data Panitera" value={clerkAssignmentForm.data.clerk_id} onChange={(value) => clerkAssignmentForm.setData('clerk_id', value)} options={clerkOptions} placeholder="Cari panitera..." searchPlaceholder="Cari panitera..." error={clerkAssignmentForm.errors.clerk_id} /><Combobox label="Peran di Event" value={clerkAssignmentForm.data.role} onChange={(value) => clerkAssignmentForm.setData('role', value)} options={clerkRoleOptions} clearable={false} error={clerkAssignmentForm.errors.role} /><Button type="submit" loading={clerkAssignmentForm.processing} disabled={!clerkAssignmentForm.data.clerk_id}><i className="fa-solid fa-plus mr-2" />Tugaskan</Button></form></div>
                        {eventClerks.length ? <div className="divide-y divide-[#ede9e1] dark:divide-slate-800">{eventClerks.map((clerk) => <div key={clerk.id} className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between"><div className="flex min-w-0 items-center gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-cyan-50 font-bold text-cyan-700"><i className="fa-solid fa-clipboard-list" /></span><div className="min-w-0"><p className="truncate font-semibold text-[#141210] dark:text-white">{clerk.name}</p><p className="mt-0.5 text-xs text-[#706860] dark:text-slate-400">{[clerk.certification, clerk.region].filter(Boolean).join(' · ') || 'Profil panitera'}</p>{clerk.employee_number && <p className="mt-0.5 text-xs text-[#8c827a]">ID: {clerk.employee_number}</p>}</div></div><div className="flex items-center gap-2"><span className="rounded-full bg-cyan-50 px-2.5 py-1 text-xs font-semibold text-cyan-700">{clerkRoleOptions.find((option) => option.value === clerk.role)?.label || clerk.role}</span><Button variant="unstyled" size="none" type="button" onClick={() => removeEventClerk(clerk)} className="rounded-lg p-2 text-red-600 hover:bg-red-50" aria-label={`Hapus ${clerk.name} dari event`}><i className="fa-solid fa-trash" /></Button></div></div>)}</div> : <div className="p-8 text-center"><i className="fa-solid fa-clipboard-list text-3xl text-[#d8d0c7]" /><p className="mt-3 font-semibold text-[#141210] dark:text-white">Belum ada panitera yang ditugaskan</p><p className="mt-1 text-sm text-[#706860] dark:text-slate-400">Pilih dari master atau tambah panitera baru langsung dari event ini.</p></div>}
                    </div>
                )}

                {/* ════ TAB 8: WASIT & JURI ════ */}
                {activeTab === 'referees' && (
                    <div className="overflow-hidden rounded-2xl border border-[#ede9e1] bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
                        <div className="flex flex-col gap-4 border-b border-[#ede9e1] p-5 md:flex-row md:items-center md:justify-between dark:border-slate-800">
                            <div>
                                <h3 className="text-base font-bold text-[#0f0d0b] dark:text-white">Penugasan Wasit & Juri</h3>
                                <p className="mt-1 text-xs text-[#706860] dark:text-slate-400">Pilih perangkat perwasitan dari master data untuk event ini.</p>
                            </div>
                            <Button type="button" onClick={() => setIsNewRefereeModalOpen(true)} className="bg-[#141210] text-amber-400 hover:bg-black"><i className="fa-solid fa-user-plus mr-2" />Tambah Wasit Baru</Button>
                        </div>

                        <div className="border-b border-[#ede9e1] bg-[#fcfbf9] p-5 dark:border-slate-800 dark:bg-slate-950/40">
                            <form onSubmit={submitRefereeAssignment} className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px_auto] md:items-end">
                                <Combobox label="Pilih dari Master Data Wasit" value={refereeAssignmentForm.data.referee_id} onChange={(value) => refereeAssignmentForm.setData('referee_id', value)} options={refereeOptions} placeholder="Cari nama wasit..." searchPlaceholder="Cari wasit..." error={refereeAssignmentForm.errors.referee_id} />
                                <Combobox label="Peran di Event" value={refereeAssignmentForm.data.role} onChange={(value) => refereeAssignmentForm.setData('role', value)} options={refereeRoleOptions} clearable={false} error={refereeAssignmentForm.errors.role} />
                                <Button type="submit" loading={refereeAssignmentForm.processing} disabled={!refereeAssignmentForm.data.referee_id}><i className="fa-solid fa-plus mr-2" />Tugaskan</Button>
                            </form>
                        </div>

                        {eventReferees.length ? <div className="divide-y divide-[#ede9e1] dark:divide-slate-800">{eventReferees.map((referee) => <div key={referee.id} className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between"><div className="flex min-w-0 items-center gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-50 font-bold text-rose-700"><i className="fa-solid fa-scale-balanced" /></span><div className="min-w-0"><p className="truncate font-semibold text-[#141210] dark:text-white">{referee.name}</p><p className="mt-0.5 text-xs text-[#706860] dark:text-slate-400">{[referee.dan_grade, referee.certification_level, referee.region].filter(Boolean).join(' · ') || 'Profil wasit'}</p>{referee.license_number && <p className="mt-0.5 text-xs text-[#8c827a]">Lisensi: {referee.license_number}</p>}</div></div><div className="flex items-center gap-2"><span className="rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700">{refereeRoleOptions.find((option) => option.value === referee.role)?.label || referee.role}</span><Button variant="unstyled" size="none" type="button" onClick={() => removeEventReferee(referee)} className="rounded-lg p-2 text-red-600 hover:bg-red-50" aria-label={`Hapus ${referee.name} dari event`}><i className="fa-solid fa-trash" /></Button></div></div>)}</div> : <div className="p-8 text-center"><i className="fa-solid fa-scale-balanced text-3xl text-[#d8d0c7]" /><p className="mt-3 font-semibold text-[#141210] dark:text-white">Belum ada wasit yang ditugaskan</p><p className="mt-1 text-sm text-[#706860] dark:text-slate-400">Pilih dari master atau tambahkan wasit baru langsung dari event ini.</p></div>}
                    </div>
                )}

                {/* ════ TAB 8: BIAYA KONTINGEN (DASHBOARD STYLE) ════ */}
                {activeTab === 'fees' && (
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-[#ede9e1] dark:border-slate-800 shadow-xs overflow-hidden">
                        <form onSubmit={submitFees}>
                            <div className="p-5 md:px-6 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#ede9e1]">
                                <div>
                                    <div className="flex items-center gap-3">
                                        <h3 className="font-cinzel text-base md:text-lg font-bold text-[#0f0d0b] dark:text-white tracking-wide uppercase">
                                            Pengaturan Biaya Registrasi
                                        </h3>
                                    </div>
                                    <p className="text-xs text-[#b5afa6] dark:text-slate-400 mt-1">
                                        Tentukan apakah event gratis atau menggunakan biaya registrasi
                                    </p>
                                </div>
                                <Button size="sm"
                                    type="submit"
                                    loading={feesForm.processing}
                                    className="shrink-0"
                                    iconLeft={<i className="fa-solid fa-check" />}
                                >
                                    Simpan Pengaturan
                                </Button>
                            </div>

                            <div className="p-6 md:p-8 space-y-6">
                                <RadioGroup
                                    label="Skema Biaya Event"
                                    name="detail-event-pricing-mode"
                                    variant="cards"
                                    value={feesForm.data.is_paid ? 'paid' : 'free'}
                                    onChange={(value) => feesForm.setData('is_paid', value === 'paid')}
                                    error={feesForm.errors.is_paid}
                                    options={[
                                        { value: 'paid', label: 'Event Berbayar', description: 'Aktifkan biaya registrasi, kode unik, dan metode pembayaran.', icon: <i className="fa-solid fa-wallet" /> },
                                        { value: 'free', label: 'Event Gratis', description: 'Peserta mendaftar tanpa tagihan dan tanpa tahap pembayaran.', icon: <i className="fa-solid fa-gift" /> },
                                    ]}
                                />

                                {feesForm.data.is_paid ? <>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <Input
                                            label="Biaya Pendaftaran Kontingen (Per Dojo/Kontingen)"
                                            type="number"
                                            min="0"
                                            step="1000"
                                            required
                                            value={feesForm.data.fee_per_contingent}
                                            onChange={(e) => feesForm.setData('fee_per_contingent', e.target.value)}
                                            error={feesForm.errors.fee_per_contingent}
                                            iconLeft={<span className="text-xs font-bold text-gray-400">Rp</span>}
                                        />
                                        <p className="text-xs text-slate-800 font-bold font-mono">
                                            Pratinjau: {formatIDR(feesForm.data.fee_per_contingent)} / Kontingen
                                        </p>
                                    </div>

                                    <div className="space-y-2">
                                        <Input
                                            label="Biaya Dasar Pendaftaran Per Atlet (Default)"
                                            type="number"
                                            min="0"
                                            step="1000"
                                            required
                                            value={feesForm.data.fee_per_athlete}
                                            onChange={(e) => feesForm.setData('fee_per_athlete', e.target.value)}
                                            error={feesForm.errors.fee_per_athlete}
                                            iconLeft={<span className="text-xs font-bold text-gray-400">Rp</span>}
                                        />
                                        <p className="text-xs text-slate-800 font-bold font-mono">
                                            Pratinjau: {formatIDR(feesForm.data.fee_per_athlete)} / Atlet
                                        </p>
                                    </div>
                                </div>

                                <div className="bg-[#fcfbf9] p-4 rounded-xl border border-[#ede9e1]">
                                    <h4 className="text-xs font-bold text-[#0f0d0b] flex items-center gap-1.5">
                                        <i className="fa-solid fa-circle-info text-[#c0392b]"></i>
                                        Catatan Penentuan Biaya:
                                    </h4>
                                    <p className="text-xs text-[#706860] mt-1">
                                        Jika Anda telah menetapkan harga khusus pada tab <strong>Kelompok Umur</strong>, sistem akan secara otomatis membebankan tarif sesuai kelompok umur yang didaftarkan atlet. Nilai biaya dasar di atas berfungsi sebagai tarif default apabila tidak ada kelompok umur khusus yang ditetapkan.
                                    </p>
                                </div>

                                <div className="rounded-xl border border-[#ede9e1] bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
                                    <div className="flex items-start gap-3">
                                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-700"><i className="fa-solid fa-money-check-dollar" /></span>
                                        <div>
                                            <h4 className="text-sm font-bold text-[#0f0d0b] dark:text-white">Metode Pembayaran yang Diterima</h4>
                                            <p className="mt-0.5 text-xs text-[#706860] dark:text-slate-400">Pilih kanal pembayaran yang dapat digunakan kontingen untuk biaya pendaftaran event ini.</p>
                                        </div>
                                    </div>
                                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                                        {paymentMethods.length ? paymentMethods.map((paymentMethod) => {
                                            const isSelected = feesForm.data.payment_method_ids.includes(paymentMethod.id);
                                            return <Checkbox key={paymentMethod.id} id={`event-payment-method-${paymentMethod.id}`} checked={isSelected}
                                                onChange={(event) => feesForm.setData('payment_method_ids', event.target.checked ? [...feesForm.data.payment_method_ids, paymentMethod.id] : feesForm.data.payment_method_ids.filter((id) => id !== paymentMethod.id))}
                                                className={`rounded-xl border p-3 transition-colors ${isSelected ? 'border-[#c0392b]/40 bg-[#c0392b]/5' : 'border-[#ede9e1] hover:border-[#d8d0c7]'}`}
                                                label={<span className="min-w-0"><span className="block text-sm font-semibold text-[#141210] dark:text-white">{paymentMethod.name}</span><span className="mt-0.5 block text-xs font-normal text-[#706860] dark:text-slate-400">{paymentMethod.provider || paymentMethod.type}{paymentMethod.account_number ? ` · ${paymentMethod.account_number}` : ''}</span>{!paymentMethod.is_active && <span className="mt-1 inline-block text-[10px] font-semibold text-amber-700">Master nonaktif — tetap dipilih di event ini</span>}</span>} />;
                                        }) : <p className="text-sm text-[#706860]">Belum ada metode pembayaran aktif. Tambahkan melalui menu Master Metode Pembayaran.</p>}
                                    </div>
                                    {feesForm.errors.payment_method_ids && <p className="mt-2 text-xs font-medium text-rose-500">{feesForm.errors.payment_method_ids}</p>}
                                </div>
                                </> : <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-900">
                                    <div className="flex items-start gap-3">
                                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-emerald-700"><i className="fa-solid fa-circle-check" /></span>
                                        <div>
                                            <h4 className="text-sm font-bold">Registrasi gratis tanpa pembayaran</h4>
                                            <p className="mt-1 text-xs leading-relaxed text-emerald-700">Biaya kontingen dan atlet akan disimpan Rp0. Registrasi yang sudah ada ikut disesuaikan dan peserta langsung dapat melanjutkan ke tahap review.</p>
                                        </div>
                                    </div>
                                </div>}
                            </div>
                        </form>
                    </div>
                )}
            </div>

            {/* ══════════════════════════════════════════════════════════════ */}
            {/* MODAL 1: KELOMPOK UMUR (CREATE / EDIT)                        */}
            {/* ══════════════════════════════════════════════════════════════ */}
            <Modal
                isOpen={isAgeModalOpen}
                onClose={() => setIsAgeModalOpen(false)}
                title={editingAgeCategory ? 'Edit Kelompok Umur' : 'Tambah Kelompok Umur Baru'}
                description="Tentukan nama kelompok umur, rentang usia, dan tarif biaya pendaftarannya."
                footer={
                    <div className="flex items-center justify-end gap-2 w-full">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setIsAgeModalOpen(false)}
                            disabled={ageForm.processing}
                        >
                            Batal
                        </Button>
                        <Button
                            type="button"
                            variant="primary"
                            onClick={submitAgeCategory}
                            loading={ageForm.processing}
                            className="bg-[#141210] hover:bg-black text-amber-400 font-semibold"
                        >
                            {editingAgeCategory ? 'Simpan Perubahan' : 'Tambahkan Kategori'}
                        </Button>
                    </div>
                }
            >
                <form onSubmit={submitAgeCategory} className="space-y-4">
                    <Input
                        label="Nama Kelompok Umur"
                        required
                        value={ageForm.data.name}
                        onChange={(e) => ageForm.setData('name', e.target.value)}
                        error={ageForm.errors.name}
                        placeholder="e.g. Pemula, Remaja A, Dewasa"
                    />

                    <div className="space-y-1">
                        <Input
                            label="Tarif Biaya Pendaftaran (Rp)"
                            type="number"
                            min="0"
                            step="1000"
                            required
                            value={ageForm.data.fee}
                            onChange={(e) => ageForm.setData('fee', e.target.value)}
                            error={ageForm.errors.fee}
                            iconLeft={<span className="text-xs font-bold text-gray-400">Rp</span>}
                            placeholder="400000"
                        />
                        <p className="text-xs text-emerald-700 font-bold">
                            Pratinjau Biaya: {formatIDR(ageForm.data.fee)}
                        </p>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-3">
                        <Input
                            label="Usia Minimal (Tahun)"
                            type="number"
                            min="1"
                            max="100"
                            value={ageForm.data.min_age}
                            onChange={(e) => ageForm.setData('min_age', e.target.value)}
                            error={ageForm.errors.min_age}
                            placeholder="e.g. 7"
                        />
                        <Input
                            label="Usia Maksimal (Tahun)"
                            type="number"
                            min="1"
                            max="100"
                            value={ageForm.data.max_age}
                            onChange={(e) => ageForm.setData('max_age', e.target.value)}
                            error={ageForm.errors.max_age}
                            placeholder="e.g. 10"
                        />
                    </div>

                    <Input
                        label="Keterangan / Batasan Kelahiran"
                        value={ageForm.data.description}
                        onChange={(e) => ageForm.setData('description', e.target.value)}
                        error={ageForm.errors.description}
                        placeholder="e.g. Kenshi kelahiran 2016 - 2019"
                    />

                    <div className="grid grid-cols-2 gap-3 pt-2">
                        <Input
                            label="Urutan Tampilan"
                            type="number"
                            min="0"
                            value={ageForm.data.order}
                            onChange={(e) => ageForm.setData('order', e.target.value)}
                            error={ageForm.errors.order}
                        />
                        <div className="flex items-center pt-6">
                            <Checkbox id="age-category-is-active" label="Status Aktif" checked={ageForm.data.is_active}
                                onChange={(event) => ageForm.setData('is_active', event.target.checked)} />
                        </div>
                    </div>
                </form>
            </Modal>

            {/* DELETE AGE CATEGORY CONFIRMATION */}
            <Modal
                isOpen={!!deletingAgeCategory}
                onClose={() => setDeletingAgeCategory(null)}
                title="Konfirmasi Hapus Kelompok Umur"
                description={`Apakah Anda yakin ingin menghapus kelompok umur '${deletingAgeCategory?.name}'? Seluruh nomer pertandingan yang terhubung akan disesuaikan.`}
                footer={
                    <div className="flex items-center justify-end gap-2 w-full">
                        <Button variant="outline" onClick={() => setDeletingAgeCategory(null)}>
                            Batal
                        </Button>
                        <Button variant="danger" onClick={confirmDeleteAgeCategory}>
                            Hapus Kategori
                        </Button>
                    </div>
                }
            />

            {/* ══════════════════════════════════════════════════════════════ */}
            {/* MODAL 2: LAPANGAN / COURT (CREATE / EDIT)                     */}
            {/* ══════════════════════════════════════════════════════════════ */}
            <Modal
                isOpen={isCourtModalOpen}
                onClose={() => setIsCourtModalOpen(false)}
                title={editingCourt ? 'Edit Lapangan (Court)' : 'Tambah Lapangan Pertandingan Baru'}
                description="Tentukan nama lapangan (misal Court 1, Court 2), lokasi gelanggang, dan statusnya."
                footer={
                    <div className="flex items-center justify-end gap-2 w-full">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setIsCourtModalOpen(false)}
                            disabled={courtForm.processing}
                        >
                            Batal
                        </Button>
                        <Button
                            type="button"
                            variant="primary"
                            onClick={submitCourt}
                            loading={courtForm.processing}
                            className="bg-[#141210] hover:bg-black text-amber-400 font-semibold"
                        >
                            {editingCourt ? 'Simpan Perubahan' : 'Tambahkan Lapangan'}
                        </Button>
                    </div>
                }
            >
                <form onSubmit={submitCourt} className="space-y-4">
                    <Input
                        label="Nama Lapangan (Court / Tatami)"
                        required
                        value={courtForm.data.name}
                        onChange={(e) => courtForm.setData('name', e.target.value)}
                        error={courtForm.errors.name}
                        placeholder="e.g. Court 1, Tatami Utama"
                    />

                    <Input
                        label="Lokasi Gelanggang / Area"
                        value={courtForm.data.location}
                        onChange={(e) => courtForm.setData('location', e.target.value)}
                        error={courtForm.errors.location}
                        placeholder="e.g. Hall Utama Sisi Barat, Center Arena"
                    />

                    <Textarea
                        label="Keterangan Tambahan"
                        rows={3}
                        value={courtForm.data.description}
                        onChange={(e) => courtForm.setData('description', e.target.value)}
                        error={courtForm.errors.description}
                        placeholder="e.g. Khusus partai semifinal & final"
                    />

                    <div className="grid grid-cols-2 gap-3 pt-2">
                        <Input
                            label="Urutan Lapangan"
                            type="number"
                            min="0"
                            value={courtForm.data.order}
                            onChange={(e) => courtForm.setData('order', e.target.value)}
                            error={courtForm.errors.order}
                        />
                        <div className="flex items-center pt-6">
                            <Checkbox id="court-is-active" label="Lapangan Siap Pakai (Aktif)" checked={courtForm.data.is_active}
                                onChange={(event) => courtForm.setData('is_active', event.target.checked)} />
                        </div>
                    </div>
                </form>
            </Modal>

            {/* DELETE COURT CONFIRMATION */}
            <Modal
                isOpen={!!deletingCourt}
                onClose={() => setDeletingCourt(null)}
                title="Konfirmasi Hapus Lapangan"
                description={`Apakah Anda yakin ingin menghapus '${deletingCourt?.name}'?`}
                footer={
                    <div className="flex items-center justify-end gap-2 w-full">
                        <Button variant="outline" onClick={() => setDeletingCourt(null)}>
                            Batal
                        </Button>
                        <Button variant="danger" onClick={confirmDeleteCourt}>
                            Hapus Lapangan
                        </Button>
                    </div>
                }
            />

            {/* ══════════════════════════════════════════════════════════════ */}
            {/* MODAL 3: NOMER PERTANDINGAN (CREATE / EDIT)                   */}
            {/* ══════════════════════════════════════════════════════════════ */}
            <Modal
                isOpen={isMatchModalOpen}
                onClose={() => setIsMatchModalOpen(false)}
                size="xl"
                title={editingMatchCategory ? 'Edit Nomer Pertandingan' : 'Tambah Nomer Pertandingan Baru'}
                description="Tautkan nomor tanding dengan kelompok umur, jenis (Embu/Randori), gender, dan kuota."
                footer={
                    <div className="flex items-center justify-end gap-2 w-full">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setIsMatchModalOpen(false)}
                            disabled={matchForm.processing}
                        >
                            Batal
                        </Button>
                        <Button
                            type="button"
                            variant="primary"
                            onClick={submitMatchCategory}
                            loading={matchForm.processing}
                            className="bg-[#141210] hover:bg-black text-amber-400 font-semibold"
                        >
                            {editingMatchCategory ? 'Simpan Perubahan' : 'Tambahkan Nomer Tanding'}
                        </Button>
                    </div>
                }
            >
                <form onSubmit={submitMatchCategory} className="space-y-4">
                    <Input
                        label="Nama Nomer Pertandingan"
                        required
                        value={matchForm.data.name}
                        onChange={(e) => matchForm.setData('name', e.target.value)}
                        error={matchForm.errors.name}
                        placeholder="e.g. Embu Berpasangan Kyu 7-5 Putra, Randori Kelas 50kg"
                    />

                    <Combobox
                        label="Kelompok Umur (Relasi)"
                        value={matchForm.data.age_category_id}
                        onChange={(val) => matchForm.setData('age_category_id', val)}
                        options={ageCategoryOptions}
                        searchPlaceholder="Pilih kelompok umur..."
                        error={matchForm.errors.age_category_id}
                    />

                    <div className="grid grid-cols-2 gap-3">
                        <Combobox
                            label="Tipe Pertandingan"
                            required
                            value={matchForm.data.type}
                            onChange={(val) => matchForm.setData('type', val)}
                            options={matchTypeOptions}
                            clearable={false}
                            error={matchForm.errors.type}
                        />

                        <Combobox
                            label="Kategori Gender"
                            required
                            value={matchForm.data.gender}
                            onChange={(val) => matchForm.setData('gender', val)}
                            options={matchGenderOptions}
                            clearable={false}
                            error={matchForm.errors.gender}
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <Input
                            label="Kapasitas / Kuota Peserta (Bagan)"
                            type="number"
                            min="2"
                            max="256"
                            required
                            value={matchForm.data.capacity}
                            onChange={(e) => matchForm.setData('capacity', e.target.value)}
                            error={matchForm.errors.capacity}
                            placeholder="16 atau 32"
                        />
                        <Combobox
                            label="Maks. Atlet per Tim"
                            required
                            value={matchForm.data.max_athletes_per_team}
                            onChange={(val) => matchForm.setData('max_athletes_per_team', val)}
                            options={teamSizeOptions}
                            clearable={false}
                            error={matchForm.errors.max_athletes_per_team}
                            hint="Pilih 1 untuk individu, 2 atau 4 untuk nomor beregu."
                        />
                        <Input
                            label="Urutan"
                            type="number"
                            min="0"
                            value={matchForm.data.order}
                            onChange={(e) => matchForm.setData('order', e.target.value)}
                            error={matchForm.errors.order}
                        />
                    </div>

                    {/* Conditional Fields depending on Type (Embu vs Randori) */}
                    {matchForm.data.type === 'randori' ? (
                        <div className="p-3 bg-red-50 rounded-xl border border-red-200 space-y-3">
                            <p className="text-xs font-bold text-red-900 flex items-center gap-1.5">
                                <i className="fa-solid fa-weight-scale text-red-600"></i>
                                Batas Berat Badan Randori (kg)
                            </p>
                            <Combobox
                                label="Ambil dari Master Berat Badan"
                                value={matchForm.data.weight_class_id}
                                onChange={applyWeightClass}
                                options={weightClassOptions}
                                placeholder="Pilih kelas berat (opsional)"
                                searchPlaceholder="Cari kelas berat..."
                                hint="Memilih kelas akan mengisi batas berat otomatis; masih dapat disesuaikan untuk event ini."
                                error={matchForm.errors.weight_class_id}
                            />
                            <div className="grid grid-cols-2 gap-3">
                                <Input
                                    label="Berat Minimal (kg)"
                                    type="number"
                                    step="0.1"
                                    value={matchForm.data.min_weight}
                                    onChange={(e) => matchForm.setData('min_weight', e.target.value)}
                                    error={matchForm.errors.min_weight}
                                    placeholder="e.g. 45"
                                />
                                <Input
                                    label="Berat Maksimal (kg)"
                                    type="number"
                                    step="0.1"
                                    value={matchForm.data.max_weight}
                                    onChange={(e) => matchForm.setData('max_weight', e.target.value)}
                                    error={matchForm.errors.max_weight}
                                    placeholder="e.g. 50"
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-200 space-y-3">
                            <p className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                                <i className="fa-solid fa-medal text-indigo-600"></i>
                                Tingkatan Sabuk / Kyu Kenshi
                            </p>
                            <div className="grid grid-cols-2 gap-3">
                                <Combobox
                                    label="Kyu / Dan Minimal"
                                    options={kyuOptions}
                                    value={matchForm.data.min_kyu}
                                    onChange={(value) => matchForm.setData('min_kyu', value)}
                                    error={matchForm.errors.min_kyu}
                                    placeholder="Pilih Kyu minimum"
                                    searchPlaceholder="Cari tingkatan..."
                                />
                                <Combobox
                                    label="Kyu / Dan Maksimal"
                                    options={kyuOptions}
                                    value={matchForm.data.max_kyu}
                                    onChange={(value) => matchForm.setData('max_kyu', value)}
                                    error={matchForm.errors.max_kyu}
                                    placeholder="Pilih Kyu maksimum"
                                    searchPlaceholder="Cari tingkatan..."
                                />
                            </div>
                        </div>
                    )}

                    <div className="flex items-center pt-2">
                        <Checkbox id="match-category-is-active" label="Nomor Pertandingan Dibuka untuk Pendaftaran (Aktif)" checked={matchForm.data.is_active}
                            onChange={(event) => matchForm.setData('is_active', event.target.checked)} />
                    </div>
                </form>
            </Modal>

            {/* DELETE MATCH CATEGORY CONFIRMATION */}
            <Modal
                isOpen={!!deletingMatchCategory}
                onClose={() => setDeletingMatchCategory(null)}
                title="Konfirmasi Hapus Nomer Pertandingan"
                description={`Apakah Anda yakin ingin menghapus '${deletingMatchCategory?.name}'?`}
                footer={
                    <div className="flex items-center justify-end gap-2 w-full">
                        <Button variant="outline" onClick={() => setDeletingMatchCategory(null)}>
                            Batal
                        </Button>
                        <Button variant="danger" onClick={confirmDeleteMatchCategory}>
                            Hapus Nomer Tanding
                        </Button>
                    </div>
                }
            />

            {/* ══════════════════════════════════════════════════════════════ */}
            {/* MODAL 4: RUNDOWN ACARA (CREATE / EDIT)                        */}
            {/* ══════════════════════════════════════════════════════════════ */}
            <Modal
                isOpen={isRundownModalOpen}
                onClose={() => setIsRundownModalOpen(false)}
                title={editingRundown ? 'Edit Sesi Rundown' : 'Tambah Sesi Rundown Baru'}
                description="Tentukan waktu pelaksanaan, nama kegiatan, dan jenis sesi acara."
                footer={
                    <div className="flex items-center justify-end gap-2 w-full">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setIsRundownModalOpen(false)}
                            disabled={rundownForm.processing}
                        >
                            Batal
                        </Button>
                        <Button
                            type="button"
                            variant="primary"
                            onClick={submitRundown}
                            loading={rundownForm.processing}
                            className="bg-[#141210] hover:bg-black text-amber-400 font-semibold"
                        >
                            {editingRundown ? 'Simpan Perubahan' : 'Tambahkan Sesi'}
                        </Button>
                    </div>
                }
            >
                <form onSubmit={submitRundown} className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <Input
                            label="Tanggal Sesi"
                            type="date"
                            required
                            value={rundownForm.data.date}
                            onChange={(e) => rundownForm.setData('date', e.target.value)}
                            error={rundownForm.errors.date}
                        />
                        <Input
                            label="Jam Mulai"
                            type="time"
                            required
                            value={rundownForm.data.time}
                            onChange={(e) => rundownForm.setData('time', e.target.value)}
                            error={rundownForm.errors.time}
                        />
                        <Input
                            label="Jam Selesai"
                            type="time"
                            value={rundownForm.data.end_time}
                            onChange={(e) => rundownForm.setData('end_time', e.target.value)}
                            error={rundownForm.errors.end_time}
                        />
                    </div>

                    <Checkbox id="rundown-is-match-session" checked={rundownForm.data.is_match_session}
                        onChange={(event) => rundownForm.setData('is_match_session', event.target.checked)}
                        label="Gunakan sebagai sesi pertandingan"
                        description="Generator hanya menempatkan partai pada rundown yang dicentang dan berada dalam rentang jam mulai–selesai."
                        className="rounded-xl border border-[#e5ddd3] bg-[#faf8f4] p-3.5" />

                    <Input
                        label="Nama Kegiatan / Sesi"
                        required
                        value={rundownForm.data.name}
                        onChange={(e) => rundownForm.setData('name', e.target.value)}
                        error={rundownForm.errors.name}
                        placeholder="e.g. Babak Penyisihan Randori Remaja A"
                    />

                    <Combobox
                        label="Kategori / Tipe Sesi"
                        required
                        value={rundownForm.data.type}
                        onChange={(val) => rundownForm.setData('type', val)}
                        options={rundownTypeOptions}
                        clearable={false}
                        error={rundownForm.errors.type}
                    />

                    <Textarea
                        label="Deskripsi / Catatan Petunjuk"
                        rows={3}
                        value={rundownForm.data.description}
                        onChange={(e) => rundownForm.setData('description', e.target.value)}
                        error={rundownForm.errors.description}
                        placeholder="e.g. Bertempat di Tatami 1 & Tatami 2"
                    />

                    <Input
                        label="Nomor Urut Sesi"
                        type="number"
                        min="0"
                        value={rundownForm.data.order}
                        onChange={(e) => rundownForm.setData('order', e.target.value)}
                        error={rundownForm.errors.order}
                    />
                </form>
            </Modal>

            {/* DELETE RUNDOWN CONFIRMATION */}
            <Modal
                isOpen={!!deletingRundown}
                onClose={() => setDeletingRundown(null)}
                title="Konfirmasi Hapus Sesi Rundown"
                description={`Apakah Anda yakin ingin menghapus '${deletingRundown?.name}' dari susunan acara?`}
                footer={
                    <div className="flex items-center justify-end gap-2 w-full">
                        <Button variant="outline" onClick={() => setDeletingRundown(null)}>
                            Batal
                        </Button>
                        <Button variant="danger" onClick={confirmDeleteRundown}>
                            Hapus Sesi
                        </Button>
                    </div>
                }
            />

            <Modal
                isOpen={isNewRefereeModalOpen}
                onClose={() => setIsNewRefereeModalOpen(false)}
                title="Tambah Wasit Baru ke Event"
                footer={<><Button variant="outline" onClick={() => setIsNewRefereeModalOpen(false)}>Batal</Button><Button onClick={submitNewReferee} loading={newRefereeForm.processing}>Simpan & Tugaskan</Button></>}
            >
                <form onSubmit={submitNewReferee} className="space-y-4">
                    <Input label="Nama Wasit / Juri" required value={newRefereeForm.data.name} onChange={(e) => newRefereeForm.setData('name', e.target.value)} error={newRefereeForm.errors.name} placeholder="Contoh: Sensei Budi Santoso" />
                    <div className="grid gap-4 sm:grid-cols-2"><Input label="Tingkatan Dan" value={newRefereeForm.data.dan_grade} onChange={(e) => newRefereeForm.setData('dan_grade', e.target.value)} error={newRefereeForm.errors.dan_grade} placeholder="Contoh: Dan IV" /><Combobox label="Peran di Event" value={newRefereeForm.data.role} onChange={(value) => newRefereeForm.setData('role', value)} options={refereeRoleOptions} clearable={false} error={newRefereeForm.errors.role} /></div>
                    <div className="grid gap-4 sm:grid-cols-2"><Input label="Nomor Lisensi" value={newRefereeForm.data.license_number} onChange={(e) => newRefereeForm.setData('license_number', e.target.value)} error={newRefereeForm.errors.license_number} /><Input label="Wilayah / Pengda" value={newRefereeForm.data.region} onChange={(e) => newRefereeForm.setData('region', e.target.value)} error={newRefereeForm.errors.region} /></div>
                    <Input label="Nomor Telepon" value={newRefereeForm.data.phone} onChange={(e) => newRefereeForm.setData('phone', e.target.value)} error={newRefereeForm.errors.phone} />
                </form>
            </Modal>

            <Modal isOpen={isNewClerkModalOpen} onClose={() => setIsNewClerkModalOpen(false)} title="Tambah Panitera Baru ke Event" footer={<><Button variant="outline" onClick={() => setIsNewClerkModalOpen(false)}>Batal</Button><Button onClick={submitNewClerk} loading={newClerkForm.processing}>Simpan & Tugaskan</Button></>}>
                <form onSubmit={submitNewClerk} className="space-y-4"><Input label="Nama Panitera" required value={newClerkForm.data.name} onChange={(e) => newClerkForm.setData('name', e.target.value)} error={newClerkForm.errors.name} placeholder="Contoh: Dewi Lestari" /><div className="grid gap-4 sm:grid-cols-2"><Input label="ID Panitia / Nomor Pegawai" value={newClerkForm.data.employee_number} onChange={(e) => newClerkForm.setData('employee_number', e.target.value)} error={newClerkForm.errors.employee_number} /><Combobox label="Peran di Event" value={newClerkForm.data.role} onChange={(value) => newClerkForm.setData('role', value)} options={clerkRoleOptions} clearable={false} error={newClerkForm.errors.role} /></div><div className="grid gap-4 sm:grid-cols-2"><Input label="Sertifikasi" value={newClerkForm.data.certification} onChange={(e) => newClerkForm.setData('certification', e.target.value)} error={newClerkForm.errors.certification} /><Input label="Wilayah / Pengda" value={newClerkForm.data.region} onChange={(e) => newClerkForm.setData('region', e.target.value)} error={newClerkForm.errors.region} /></div><Input label="Nomor Telepon" value={newClerkForm.data.phone} onChange={(e) => newClerkForm.setData('phone', e.target.value)} error={newClerkForm.errors.phone} /></form>
            </Modal>

            <Modal isOpen={isNewFieldCoordinatorModalOpen} onClose={() => setIsNewFieldCoordinatorModalOpen(false)} title="Tambah Koordinator Lapangan Baru" footer={<><Button variant="outline" onClick={() => setIsNewFieldCoordinatorModalOpen(false)}>Batal</Button><Button onClick={submitNewFieldCoordinator} loading={newFieldCoordinatorForm.processing}>Simpan & Tugaskan</Button></>}><form onSubmit={submitNewFieldCoordinator} className="space-y-4"><Input label="Nama Koordinator" required value={newFieldCoordinatorForm.data.name} onChange={(e) => newFieldCoordinatorForm.setData('name', e.target.value)} error={newFieldCoordinatorForm.errors.name} /><div className="grid gap-4 sm:grid-cols-2"><Input label="ID Koordinator" value={newFieldCoordinatorForm.data.coordinator_number} onChange={(e) => newFieldCoordinatorForm.setData('coordinator_number', e.target.value)} error={newFieldCoordinatorForm.errors.coordinator_number} /><Combobox label="Area Penugasan" value={newFieldCoordinatorForm.data.assignment_area} onChange={(value) => newFieldCoordinatorForm.setData('assignment_area', value)} options={fieldCoordinatorAreaOptions} clearable={false} error={newFieldCoordinatorForm.errors.assignment_area} /></div><div className="grid gap-4 sm:grid-cols-2"><Input label="Wilayah / Pengda" value={newFieldCoordinatorForm.data.region} onChange={(e) => newFieldCoordinatorForm.setData('region', e.target.value)} error={newFieldCoordinatorForm.errors.region} /><Input label="Nomor Telepon" value={newFieldCoordinatorForm.data.phone} onChange={(e) => newFieldCoordinatorForm.setData('phone', e.target.value)} error={newFieldCoordinatorForm.errors.phone} /></div></form></Modal>
        </AdminLayout>
    );
}
