export default function BrandLogo({
  size = 48,
  title = 'Elite Leaf Tobacco Company',
  subtitle,
  align = 'left',
  titleStyle,
  subtitleStyle,
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: align === 'center' ? 'center' : 'flex-start' }}>
      <img
        src="/logo.jpeg"
        alt="Elite Leaf Tobacco Company logo"
        style={{ width: size, height: size, objectFit: 'contain', flexShrink: 0 }}
      />
      <div>
        <div style={titleStyle}>{title}</div>
        {subtitle ? <div style={subtitleStyle}>{subtitle}</div> : null}
      </div>
    </div>
  );
}