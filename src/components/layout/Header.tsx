import { Menu as MenuIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import UserProfile from "./UserProfile";
import SearchInput from "./SearchInput";
import { useJira } from "@/contexts/JiraContext";
import JiraSettingsPopover from "./JiraSettingsPopover";

const Header = ({ toggleSidebar }: { toggleSidebar: () => void }) => {
  const { isLoading, handleFetchIssues } = useJira();

  return (
    <header className="flex items-center justify-between px-4 py-2 bg-white border-b">
      <div className="flex items-center">
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={toggleSidebar}
        >
          <MenuIcon className="h-6 w-6" />
        </Button>
        <SearchInput />
      </div>
      <div className="flex items-center space-x-2">
        <Button
          onClick={() => handleFetchIssues()}
          disabled={isLoading}
          size="sm"
        >
          {isLoading ? "Fetching..." : "Fetch Jira Issues"}
        </Button>
        <JiraSettingsPopover />
        <UserProfile />
      </div>
    </header>
  );
};

export default Header;
