export function ticketTitleEntries(
  pools: Readonly<Record<string, readonly string[]>>
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(pools).flatMap(([type, titles]) =>
      titles.map((title, index) => [`ticket.title.${type}.${index}`, title])
    )
  );
}
