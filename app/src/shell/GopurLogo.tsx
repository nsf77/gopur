import logoSvg from "./gopur-logo.svg?raw";

const viewBox = logoSvg.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);
const logoAspect = viewBox ? Number(viewBox[1]) / Number(viewBox[2]) : 2505 / 1024;
const LOGO_HEIGHT_PX = 32;
const LOGO_WIDTH_PX = Math.round(LOGO_HEIGHT_PX * logoAspect);
const inlineLogo = logoSvg.replace(
  "<svg ",
  `<svg class="h-8 w-full shrink-0" width="${LOGO_WIDTH_PX}" height="${LOGO_HEIGHT_PX}" aria-hidden="true" focusable="false" `,
);

export function GopurLogo() {
  return (
    <a
      href="/"
      class="block h-8 shrink-0 text-text no-underline"
      style={{ width: `${LOGO_WIDTH_PX}px`, height: `${LOGO_HEIGHT_PX}px` }}
      aria-label="Gopur"
      innerHTML={inlineLogo}
    />
  );
}
