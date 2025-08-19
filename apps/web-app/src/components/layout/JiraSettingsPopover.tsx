import { Button } from "../../components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "../../components/ui/popover";
import { GearIcon } from "@radix-ui/react-icons";
import { JiraConfigurator } from "../../components/JiraConfigurator";

const JiraSettingsPopover = () => {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon">
          <GearIcon className="h-6 w-6" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <JiraConfigurator />
      </PopoverContent>
    </Popover>
  );
};

export default JiraSettingsPopover;
