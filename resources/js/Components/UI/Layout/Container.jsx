export default function Container({
    children,
    size = '7xl', // sm, md, lg, xl, 2xl, 3xl, 4xl, 5xl, 6xl, 7xl, full
    className = '',
}) {
    const sizeStyles = {
        sm: 'max-w-screen-sm',
        md: 'max-w-screen-md',
        lg: 'max-w-screen-lg',
        xl: 'max-w-screen-xl',
        '2xl': 'max-w-2xl',
        '3xl': 'max-w-3xl',
        '4xl': 'max-w-4xl',
        '5xl': 'max-w-5xl',
        '6xl': 'max-w-6xl',
        '7xl': 'max-w-7xl',
        full: 'max-w-full',
    };

    return (
        <div className={`w-full mx-auto px-4 sm:px-6 lg:px-8 ${sizeStyles[size] || sizeStyles['7xl']} ${className}`}>
            {children}
        </div>
    );
}
