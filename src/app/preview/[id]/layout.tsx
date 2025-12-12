export default function PreviewLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    // Preview pages render without any wrapper - just the raw content
    return <>{children}</>;
}
