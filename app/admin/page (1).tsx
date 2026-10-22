import PageAdmin from "../Rubrique";

export const dynamic = "force-dynamic";
// Sending a club e-mail to every member can take a little while.
export const maxDuration = 60;

export default function Page() {
  return <PageAdmin rubrique="finances" />;
}
