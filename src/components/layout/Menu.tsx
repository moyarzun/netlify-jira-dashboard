import { NavLink } from "react-router-dom";
import { menuItems } from "@/lib/menu-data";
import type { MenuItem } from "@/dao/common"; // Import MenuItem type
import { useState } from "react"; // Import useState
import { ChevronDown } from "lucide-react"; // Import ChevronDown icon

// Recursive component to render menu items
const MenuItemRenderer = ({ item, level = 0 }: { item: MenuItem; level?: number }) => {
  const paddingLeft = level * 16; // Adjust as needed for indentation
  const [isExpanded, setIsExpanded] = useState(false); // State for collapsible items

  const handleToggle = () => {
    if (item.children && item.children.length > 0) {
      setIsExpanded(!isExpanded);
    }
  };

  return (
    <li>
      {item.children && item.children.length > 0 ? (
        // Render a clickable div for parent items
        <div
          className="flex items-center px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-md cursor-pointer"
          style={{ paddingLeft: `${paddingLeft}px` }}
          onClick={handleToggle}
        >
          {item.icon && <item.icon className="h-5 w-5" />}
          <span className="ml-4">{item.label}</span>
          <ChevronDown
            className={`ml-auto h-4 w-4 transition-transform ${
              isExpanded ? "rotate-180" : ""
            }`}
          />
        </div>
      ) : (
        // Render NavLink for child items
        <NavLink
          to={item.path}
          className={({ isActive }) =>
            `flex items-center px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-md ${
              isActive ? "bg-gray-200" : ""
            }`
          }
          style={{ paddingLeft: `${paddingLeft}px` }}
        >
          {item.icon && <item.icon className="h-5 w-5" />}
          <span className="ml-4">{item.label}</span>
        </NavLink>
      )}
      {item.children && item.children.length > 0 && isExpanded && (
        <ul className="ml-4"> {/* Indent children */}
          {item.children.map((child) => (
            <MenuItemRenderer key={child.path} item={child} level={level + 1} />
          ))}
        </ul>
      )}
    </li>
  );
};

const Menu = () => {
  return (
    <nav className="mt-8">
      <ul>
        {menuItems.map((item) => (
          <MenuItemRenderer key={item.path} item={item} />
        ))}
      </ul>
    </nav>
  );
};

export default Menu;
