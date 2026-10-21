import {fireEvent,render,screen,waitFor,within} from "@testing-library/react";
import {expect,it,vi} from "vitest";
import {CreateDeckDialog} from "@/components/create-deck-dialog";
import {createDeck} from "@/actions/decks";
vi.mock("@/actions/decks",()=>({createDeck:vi.fn().mockResolvedValue({id:"new"})}));
vi.mock("@/components/commander-search-input",()=>({CommanderSearchInput:()=>null}));
it("changes the format with visible choices without submitting the form, then saves the selected value",async()=>{
  render(<CreateDeckDialog initialName="Modern deck"/>);
  fireEvent.click(screen.getByRole("button",{name:"Nuevo Mazo"}));
  const dialog=within(screen.getByRole("dialog"));
  expect(dialog.queryByRole("combobox")).not.toBeInTheDocument();
  fireEvent.click(within(dialog.getByRole("group",{name:"Formato"})).getByRole("button",{name:"Modern"}));
  expect(createDeck).not.toHaveBeenCalled();
  expect(dialog.getByRole("button",{name:"Modern"})).toHaveAttribute("aria-pressed","true");
  fireEvent.click(dialog.getByRole("button",{name:"Crear Mazo"}));
  await waitFor(()=>expect(createDeck).toHaveBeenCalledWith(expect.objectContaining({name:"Modern deck",format:"Modern",commander:undefined})));
});
