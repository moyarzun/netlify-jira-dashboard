import { Menu as MenuIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import UserProfile from "./UserProfile";
import JiraSettingsPopover from "./JiraSettingsPopover";
import SprintSelector from "./SprintSelector";
import { ViewOptions } from "@/components/view-options";

const Header = ({ toggleSidebar }: { toggleSidebar: () => void }) => {
  return (
    <header className="flex items-center justify-between px-4 py-2 bg-white border-b">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={toggleSidebar}
        >
          <MenuIcon className="h-6 w-6" />
        </Button>
        <SprintSelector />
      </div>
      <div className="flex items-center space-x-2">
        <ViewOptions />
        <JiraSettingsPopover />
        <UserProfile />
      </div>
    </header>
  );
};

export default Header;
