import { navMenus } from "../data/menuData";

type MegaMenuProps = {
  activeMenu: string | null;
  onEnter: () => void;
  onLeave: () => void;
};

export default function MegaMenu({
  activeMenu,
  onEnter,
  onLeave,
}: MegaMenuProps) {
  if (!activeMenu) return null;

  const menu = navMenus[activeMenu as keyof typeof navMenus];

  if (!menu) return null;

  return (
    <div
      className="mega-menu"
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
    >
      <div className="mega-left">
        {menu.left.map((item) => (
          <div className="mega-row" key={item.title}>
            <span>{item.icon}</span>

            <div>
              <h3>{item.title}</h3>
              <p>{item.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mega-right">
        <h3>Other Products</h3>

        {menu.right.map((item, index) => (
          <p key={item}>
            › {item}
            {index === 0 && <b>25% off</b>}
          </p>
        ))}
      </div>
    </div>
  );
}