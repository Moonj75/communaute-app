"use client";

import { useRef, useState } from "react";
import { construireMail, type ContenuMail } from "@/lib/mail-modele";

/**
 * A club e-mail shown in the app's Courrier exactly as in the mailbox: the same HTML,
 * in a frame without scripts (links open in a new tab), as tall as its content.
 */
export default function MailCarte({ carte }: { carte: ContenuMail }) {
  const ref = useRef<HTMLIFrameElement>(null);
  const [h, setH] = useState(520);
  const html = construireMail(carte, null).replace(
    "</head>",
    `<base target="_blank"><style>body{background:transparent!important}body>table{background:transparent!important}body>table>tbody>tr>td{padding:0!important}</style></head>`,
  );
  const ajuster = () => {
    const d = ref.current?.contentDocument;
    if (d?.body) setH(d.documentElement.scrollHeight || d.body.scrollHeight);
  };
  return (
    <iframe
      ref={ref}
      title={carte.titre}
      srcDoc={html}
      sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
      onLoad={() => { ajuster(); window.setTimeout(ajuster, 400); }}
      style={{ display: "block", width: "100%", height: h, border: 0, background: "transparent", margin: "4px 0 10px" }}
    />
  );
}
