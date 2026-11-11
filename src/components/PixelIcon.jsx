import { iconUrl } from '../game/icons.js'

/** 게임 톤 픽셀 아이콘 */
export default function PixelIcon({ name, size = 20, className = '', title }) {
  return (
    <img
      src={iconUrl(name)}
      width={size}
      height={size}
      alt={title || ''}
      aria-hidden={title ? undefined : true}
      className={`pixel-icon ${className}`}
      draggable={false}
    />
  )
}
