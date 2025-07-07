import { Link } from "react-router-dom";
import Menu from "./Menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";

interface SidebarProps {
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
}

const Sidebar = ({ isSidebarOpen, toggleSidebar }: SidebarProps) => {
  const content = (
    <>
      <div className="flex items-center justify-center h-16 border-b">
        <Link to="/" className="text-2xl font-bold text-primary">
          Logo
        </Link>
      </div>
      <ScrollArea className="flex-1">
        <Menu />
      </ScrollArea>
    </>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r">
        {content}
      </aside>

      {/* Mobile Drawer */}
      <div className="md:hidden">
        <Drawer open={isSidebarOpen} onOpenChange={toggleSidebar}>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>
                <Link
                  to="/"
                  className="text-2xl font-bold text-primary"
                  onClick={toggleSidebar}
                >
                  Logo
                </Link>
              </DrawerTitle>
            </DrawerHeader>
            <ScrollArea className="flex-1 px-4">
              <Menu />
            </ScrollArea>
          </DrawerContent>
        </Drawer>
      </div>
    </>
  );
};

export default Sidebar;
