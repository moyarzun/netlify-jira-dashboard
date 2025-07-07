import { NavLink } from "react-router-dom";
import { menuItems } from "@/lib/menu-data";

const Menu = () => {
  return (
    <nav className="mt-8">
      <ul>
        {menuItems.map((item) => (
          <li key={item.path}>
            <NavLink
              to={item.path}
              className={({ isActive }) =>
                `flex items-center px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-md ${
                  isActive ? "bg-gray-200" : ""
                }`
              }
            >
              <item.icon className="h-5 w-5" />
              <span className="ml-4">{item.label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
};

export default Menu;
