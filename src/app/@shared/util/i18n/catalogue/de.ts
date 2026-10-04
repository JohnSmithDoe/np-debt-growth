import { DE_TICKET_TITLES } from './ticket-titles.de';
import { ticketTitleEntries } from './ticket-titles';

export const DE: Readonly<Record<string, string>> = {
  ...ticketTitleEntries(DE_TICKET_TITLES),
  'skill.effect.debtInterest': '{{pct}} Chance auf eine Stufe höher',
  'skill.effect.clickRadius': '{{pct}} Maus-Radius',
  'skill.effect.escalation': '{{pct}} Eskalations-Auszahlung',
  'skill.effect.escalationHold': 'Eskalationen laufen {{seconds}}s länger',
  'skill.effect.global': '{{pct}} auf alles Abgerechnete',
  'skill.effect.nearestClaim':
    'Nimmt das nächstgelegene Ticket, nicht irgendeins',
  'skill.effect.juniorBand': 'Juniors reichen {{count}} Stufe höher',
  'skill.effect.none': 'Eröffnet das Programm',
  'skill.effect.signoff': 'Startet den Abnahme-Endspurt',
  'skill.effect.inert': 'Keine Wirkung. Gar keine.',
  'skill.effect.topOfBand': 'Seniors nehmen zuerst das größte Ticket',
  'strip.shipping': 'DIREKT LIVE',
  'strip.collecting': 'SAMMELN',
  'strip.releasing': 'IM RELEASE',
  'board.hazard.fact.due': '{{name}} IN {{seconds}}s',
  'board.hazard.fact.on': '{{name}} · {{seconds}}s',
  'board.hazard.invitation.due':
    '{{name}} IN {{seconds}}s · EINLADUNG NEHMEN ZUM ABSAGEN',
  'board.hazard.invitation.on':
    '{{name}} · ALLE GEHEN HIN, KEINER ARBEITET · {{seconds}}s',
  'board.declined': 'ABGESAGT',
  'board.declined.caption': '{{meeting}} abgesagt · das Team arbeitet weiter',
  'board.release.title': 'RELEASE-ZUG',
  'board.release.hint':
    'Der Sprint wird ausgeliefert. Bis der Zug zurück ist, nimmt niemand etwas an.',
  'release.phase.freeze': 'Code Freeze',
  'release.phase.freeze.short': 'Freeze',
  'release.phase.ship': 'Ab in Produktion',
  'release.phase.ship.short': 'Prod',
  'release.phase.smoke': 'Smoke-Test',
  'release.phase.smoke.short': 'Smoke',
  'release.phase.review': 'Sprint Review',
  'release.phase.review.short': 'Review',
  'release.phase.retro': 'Retro',
  'release.phase.retro.short': 'Retro',
  'release.phase.refinement': 'Refinement',
  'release.phase.refinement.short': 'Refine',
  'board.buff.quarter':
    'QUARTALSENDE AUF DEM BOARD · FÜR HOTFIX + ESKALATION AUFHEBEN',
  'board.buff.escalation': 'ESKALATION ×{{mult}} · {{seconds}}s',
  'board.buff.storm':
    'PERFECT STORM BEREIT · QUARTALSENDE MITNEHMEN · ×{{mult}} · {{seconds}}s',
  'board.buff.hotfix': 'HOTFIX-FENSTER ×{{mult}} · {{seconds}}s',
  'skill.effect.slots': 'Sprint-Umfang +{{count}} pro Team',
  'skill.effect.cutCeremony': 'Streicht {{phase}} aus jedem Release-Zug',
  'skill.effect.spawnRate': '{{pct}} Ticket-Spawnrate',
  'skill.effect.spawnRate.ticket': '{{pct}} Spawnrate von {{ticket}}',
  'skill.effect.standupAura': '{{each}} Junior-Tempo je Junior, bis {{cap}}',
  'skill.effect.ticketValue': '{{pct}} Wert von {{ticket}}',
  'skill.effect.autoClose': 'Liegengebliebene {{ticket}} schließen sich selbst',
  'skill.lock.blocked': 'Blockiert durch {{by}}',
  'skill.lock.underfunded': 'Budget reicht nicht',
  'skill.lock.unknown': 'Unbekannt',
  'skill.status.maxed': 'Max',
  'skill.status.ready': 'Bereit',
  'crew.takes.nothing': 'Schließt nichts — schaut zu',
  'crew.takes.upTo': 'Nimmt bis {{ticket}}',
  'hazard.all-hands.label': 'All-Hands',
  'hazard.compliance.label': 'Compliance-Schulung',
  'hazard.freeze.label': 'Prod Freeze',
  'hazard.grooming.label': 'Backlog Grooming',
  'hazard.migration.label': 'Migration Window',
  'hazard.page.label': 'Rufbereitschaft',
  'hazard.reorg.label': 'Reorg-Briefing',
  'hazard.retro.label': 'Sprint-Retro',
  'hazard.storm.label': 'Incident-Welle',
  'ticket.type.bug': 'Bug-Report',
  'ticket.type.conflict': 'Merge-Konflikt',
  'ticket.type.escalation': 'Enterprise-Eskalation',
  'ticket.type.flaky': 'Flaky Test',
  'ticket.type.hotfix': 'Hotfix-Fenster',
  'ticket.type.incident': 'P0-Incident',
  'ticket.type.invite': 'Kalendereinladung',
  'ticket.type.legacy': 'Legacy-Defekt',
  'ticket.type.lint': 'Lint-Warnung',
  'ticket.type.quarter': 'Quartalsende',
  'ticket.type.rewrite': 'Migrations-Schaden',
  'ticket.type.rockstar': 'Force Push',
  'ticket.type.slop': 'Halluzinierter Import',
  'ticket.type.swarm': 'Autonomer PR',
  'ticket.type.zombie': '3-Uhr-Alarm',
  'purchase.velocity.label': 'Story-Point-Schätzung',
  'purchase.kit.label': 'Schreibtisch-Ausstattung',
  'purchase.senior.label': 'Senior-Entwickler',
  'purchase.junior.effect': 'ein Abschluss alle {{seconds}}s, plus Laufweg',
  'purchase.kit.effect': 'öffnet die Schreibtisch-Ausstattung im Team-Reiter',
  'purchase.kit.next': '{{item}}: {{effect}}',
  'purchase.kit.done': 'jeder Schreibtisch ausgestattet',
  'purchase.junior.label': 'Junior-Dev',
  'hire.line': 'Senior-Dev',
  'trait.closer.blurb':
    'Kopf runter, Kopfhörer auf. Kommt schneller durch den Bereich.',
  'trait.closer.label': 'Arbeitet schnell',
  'trait.firefighter.blurb':
    'Geht zuerst an das Schlimmste. Mit sichtlicher Freude, was das Beunruhigende daran ist.',
  'trait.firefighter.label': 'Nimmt zuerst das größte',
  'trait.runner.blurb': 'Nie am Platz. Ist über die Etage, bevor man fragt.',
  'trait.runner.label': 'Schnell auf der Etage',
  'trait.scout.blurb':
    'Nimmt, was vor der Nase liegt, statt was interessant aussieht.',
  'trait.scout.label': 'Nimmt das Nächstgelegene',
  'trait.sweeper.blurb':
    'Wenn die Datei schon offen ist, ist alles daneben auch im Scope.',
  'trait.sweeper.label': 'Räumt weiter ab',
  'purchase.velocity.effect':
    'jedes geschlossene Ticket zahlt zusätzlich {{sp}} Story Point',
  'purchase.manager.effect': 'Abschlüsse in seiner Nähe rechnen ×{{aura}} ab',
  'purchase.manager.label': 'Kundenbetreuer',
  'purchase.senior.effect':
    'räumt alle {{seconds}}s den ganzen Fleck ab, ab den Merge-Konflikten aufwärts; P0s bleiben deine',
  'skill.effect.managerAura':
    '{{pct}} auf Abschlüsse unter den Augen eines Managers',
  'kit.ci-tier.blurb':
    'Abrechnung nach Build-Minuten. Die flaky Suite läuft, bis sie grün ist.',
  'kit.ci-tier.label': 'CI-Tarif: Enterprise',
  'kit.ide-licence.blurb':
    'Pro Platz, pro Jahr. Sie versteht das alte Framework — sonst niemand.',
  'kit.ide-licence.label': 'IDE-Lizenzen',
  'kit.keyboard.blurb':
    'Mechanisch, und eine Etage weiter zu hören. Bugs werden lauter gefunden.',
  'kit.keyboard.label': 'Mechanische Tastaturen',
  'kit.monitor.blurb':
    'Ein zweiter Bildschirm, damit man die Lint-Warnungen ohne Scrollen liest.',
  'kit.monitor.label': 'Zweitmonitore',
  'kit.observability.blurb':
    'Endlich sieht man es kommen. Die Eskalation läuft länger, bevor jemand eingreift.',
  'kit.observability.label': 'Observability-Anbieter',
  'kit.standing-desk.blurb':
    'Hochgefahren hat ihn noch keiner. Die Rechnung weiß davon nichts.',
  'kit.standing-desk.label': 'Steharbeitsplätze',
  'language.de': 'Deutsch',
  'language.en': 'English',
  'settings.agent.label': 'Synergie-Analyser (KI-gestützt)',
  'settings.agent.blurb':
    'Eine Büroklammer, die die Tabelle gelesen hat, sagt dir, was du als Nächstes kaufst.',
  'agent.goal.bill':
    'Sieht so aus, als wolltest du einem Kunden etwas in Rechnung stellen. Brauchst du Hilfe?',
  'agent.goal.adr':
    'Sieht so aus, als wolltest du ein ADR genehmigen. Brauchst du Hilfe?',
  'agent.goal.signoff':
    'Sieht so aus, als wolltest du die Abnahme holen. Brauchst du Hilfe?',
  'agent.goal.finish':
    'Sieht so aus, als wolltest du unterschreiben, während der Kunde manche Linien zweimal prüfen wird. Brauchst du Hilfe?',
  'agent.name': 'Synergie-Analyser (KI-gestützt)',
  'agent.buy.title': '{{name}} kaufen',
  'agent.buy.finish':
    '{{cost}}. Bring diese Linie vor der Unterschrift zu Ende: Der Kunde prüft jede Linie, und eine unfertige kommt zurück.',
  'agent.buy.detail': '{{cost}}. Gerade das meiste Wachstum für den Preis.',
  'agent.buy.opens': '{{cost}}. Öffnet {{then}}, und dort liegt das Wachstum.',
  'agent.buy.spare':
    '{{cost}}. Nichts anderes zahlt sich aus, und Story Points kaufen sonst nichts.',
  'agent.save.idle': 'Noch {{short}}, und noch verdient nichts daran.',
  'agent.save.title': 'Auf {{name}} sparen',
  'agent.save.detail':
    'Noch {{short}}, etwa {{time}}. Alles andere zuerst ist langsamer.',
  'agent.credit': '{{adr}}, auf Kredit',
  'agent.income': 'Rate: {{ticket}}',
  'agent.auto.label': 'Autokauf',
  'agent.auto.blurb': 'Kauft jeden Vorschlag, sobald er bezahlbar ist.',
  'agent.warn.body':
    'Sieht so aus, als wolltest du aufhören nachzudenken. Ich sage dir, was du als Nächstes kaufst, und mein Autokauf kauft es, sobald du es dir leisten kannst. Das ist Schummeln, und es nimmt dem Spiel jeden Spaß.',
  'agent.warn.ok': 'Verstanden',
  'agent.push.quip.0':
    'Sieht so aus, als würdest du getestet. Soll ich dazu ein Meeting ansetzen?',
  'agent.push.quip.1':
    'Tipp: Pink ist die Lieblingsfarbe des Kunden. Frag nicht, warum.',
  'agent.push.quip.2':
    'Ich habe eine 40-seitige Abnahmestrategie erstellt. Sie sagt: Sammle die pinken ein.',
  'agent.push.quip.3':
    'Fun Fact: Jedes Ticket, das du hier einsammelst, wurde schon zweimal abgerechnet.',
  'agent.push.quip.4':
    'Der Kunde sagt, der Build sei in Ordnung. Der Kunde hat den Build nicht geöffnet.',
  'agent.push.quip.5':
    'Ich würde ja helfen, aber meine Lizenz ist mit der Unterschrift abgelaufen.',
  'agent.push.quip.6':
    'Merke: Es sind keine technischen Schulden, wenn der Kunde dafür unterschreibt.',
  'agent.push.quip.7':
    'Synergie-Check: Deine Maus ist die Einzige, die noch arbeitet. Toller Culture Fit.',
  'agent.push.quip.8':
    'Ich habe dem Einkauf gesagt, du seist „fast fertig“. Bitte sei fast fertig.',
  'agent.push.quip.9':
    'Hinweis zur Barrierefreiheit: Die pinken Karten sind pink. Gern geschehen.',
  'agent.push.retest.0':
    'Sieht so aus, als käme das Kriterium zurück. Ich habe es als Learning umgedeutet.',
  'agent.push.retest.1':
    'Nachtests sind abrechenbar. Die Rechnung ist schon raus.',
  'agent.push.retest.2':
    'Schon wieder diese Linie? Sieh es als Fortsetzung, die niemand bestellt hat.',
  'settings.close': 'Zurück an die Arbeit',
  'settings.fullscreen.blurb':
    'Füllt den Bildschirm. Den Platz bekommt das Board.',
  'settings.fullscreen.label': 'Vollbild',
  'settings.help.blurb':
    'Jede Karte auf dem Board und wie der Lauf funktioniert.',
  'settings.help.label': 'Handbuch',
  'settings.heading': 'Einstellungen',
  'settings.language.blurb':
    'Beim Wechsel lädt das Spiel neu. Dein Run ist gespeichert.',
  'settings.language.label': 'Sprache',
  'settings.music.blurb': 'Chiptune in Dauerschleife.',
  'settings.music.label': 'Musik',
  'settings.music.volume': 'Lautstärke Musik',
  'settings.off': 'Aus',
  'settings.on': 'An',
  'settings.ring.blurb':
    'Zeigt rund um den Zeiger, wie weit deine Hand reicht.',
  'settings.ring.label': 'Maus-Radius anzeigen',
  'settings.sfx.blurb':
    'Jeder Effekt wird synthetisiert. Es gibt keine Dateien.',
  'settings.sfx.label': 'Soundeffekte',
  'settings.sfx.volume': 'Lautstärke Soundeffekte',
  'settings.subheading':
    'Wie sich das Spiel verhält. Nichts davon ist Fortschritt.',
  'title.fullscreen': 'Vollbild',
  'title.name': 'Schuld & Wachstum',
  'title.photosensitivity':
    'Warnung vor Lichtempfindlichkeit: Dieses Spiel enthält schnelle Lichtblitze, flackernde Farben und sich rasch bewegende Lichter.',
  'title.premise':
    'Eigentlich sollst du sauberen, wartbaren Code liefern. Bezahlt wirst du für geschlossene Tickets — und Tickets entstehen aus schlechtem Code.',
  'title.resume': 'Zurück zum Mandat',
  'title.sound.off': 'Ton ist aus',
  'title.sound.on': 'Ton ist an',
  'title.start': 'Mandat eröffnen',
  'title.strap': 'Eine Software-Beratung. Abrechnung nach Aufwand.',
  'title.windowed': 'Fenstermodus',
  'award.achievement': 'Erfolg',
  'award.dismiss': 'Schließen',
  'award.reward.euro': '+{{amount}}',
  'award.reward.sp': '+{{amount}} SP',
  'award.milestone': 'Meilenstein',
  'award.criterion': 'Abnahme',
  'award.waiting': '+{{count}} weitere',
  'hud.budget': 'Budget',
  'hud.goal.adr': '{{pct}} % bis ADR-{{adr}}',
  'hud.goal.signoff.credit':
    '{{pct}} % bis zum Abschluss · auf Kredit unterschreibbar',
  'hud.goal.signoff': '{{pct}} % bis zur Abnahme',
  'hud.points': 'Story Points',
  'hud.points.exact': '{{points}} Story Points',
  'hud.rate': '{{rate}}/s',
  'hud.epic': 'Epic: {{name}}',
  'hud.round': 'Runde',
  'hud.round.open': 'offen',
  'hud.round.acceptance': 'durchgehend',
  'hud.sprint.uncapped': 'ohne Limit',
  'hud.round.release': 'Release in {{seconds}} s',
  'hud.settings': 'Einstellungen',
  'hud.sprint': 'Sprint',
  'hud.sprint.full': 'voll · Release-Zug unterwegs',
  'hud.tree.back': 'Zurück auf die Etage',
  'hud.tree.buyable': 'etwas zu kaufen',
  'hud.tree.open': 'Den Baum öffnen',
  'finale.curtain.action': 'Maßnahme: noch einmal spielen. Verantwortlich: du.',
  'finale.curtain.again': 'Neues Mandat',
  'finale.curtain.artists':
    'Und danke an alle Künstlerinnen und Künstler im Abspann. Das Team gibt es nur, weil ihr es gezeichnet und verschenkt habt.',
  'finale.curtain.back': 'Zurück zum Post-Mortem',
  'finale.curtain.body':
    'Du hast ein ganzes Mandat lang eine Codebasis mit Absicht verschlechtert, und du warst richtig, richtig gut darin.',
  'finale.curtain.stats':
    '{{billed}} abgerechnet · {{closed}} Tickets geschlossen · {{sprints}} Sprints',
  'finale.curtain.title': 'Danke fürs Spielen.',
  'finale.roll.adrs': 'Und erstmals dabei, in der Reihenfolge ihrer Freigabe',
  'finale.roll.adrs.note': 'Alle acht sind noch in Produktion.',
  'finale.roll.approved': 'Schriftlich freigegeben für {{client}} von',
  'finale.roll.aside.backlog': 'Der Backlog ist immer noch nicht leer.',
  'finale.roll.aside.harm':
    'Bei der Entstehung dieses Spiels kam kein Ticket zu Schaden. Einige wurden als „Won’t fix“ geschlossen.',
  'finale.roll.aside.resemblance':
    'Ähnlichkeiten mit einem echten Mandat sind der ganze Witz.',
  'finale.roll.built': 'Gebaut mit',
  'finale.roll.inspired': 'Inspiriert von',
  'finale.roll.inspired.thanks':
    'Eine Beratung ist nur ein Müllunternehmen, das nach Stunden abrechnet. Spielt das Original.',
  'finale.roll.crew': 'Das Team',
  'finale.roll.drawn': 'Gezeichnet wurde das Team von',
  'finale.roll.drawn.thanks':
    'Sie haben diese Leute umsonst gezeichnet, damit Fremde so etwas bauen können. Danke.',
  'finale.roll.drawn.unnamed':
    'und den Künstlerinnen und Künstlern, deren Namen kein Sheet behalten hat',
  'finale.roll.drawn.via':
    'für den Liberated Pixel Cup, zusammengesetzt mit dem Universal LPC Spritesheet Character Generator.',
  'finale.roll.juniors': 'Juniors',
  'finale.roll.label': 'Abspann',
  'finale.roll.made': 'Geschrieben, gestaltet und abgerechnet von',
  'finale.roll.managers': 'Manager',
  'finale.roll.seniors': 'Seniors',
  'finale.skip': 'Zum Ende springen',
  'finale.stage.cake': 'zu viel Kuchen',
  'story.label': 'Die Geschichte des Mandats',
  'story.next': 'Weiter',
  'story.skip': 'Weiter zum Abspann',
  'story.1':
    'Es begann, wie so etwas immer beginnt: mit einem Framework, das niemand aktualisieren durfte. Die Beratung sah es sich an, sah auf den Stundensatz und fand es perfekt.',
  'story.2':
    'Bald merkte das Team, dass man einen Service am schnellsten schreibt, indem man den letzten kopiert. Und den davor. Das Wiki nannte es ein Muster. Die Rechnungen nannten es Wachstum.',
  'story.3':
    'Als der Backlog dem Gebäude entwachsen war, ging die Arbeit einmal um die Welt. Das Büro schlief nie wieder. Es lag nur nicht mehr in einer einzigen Zeitzone.',
  'story.4':
    'Dann kam das Werkzeug, das den Code selbst schrieb. Es war flüssig, selbstsicher und falsch – was, wie die Partner bemerkten, auch der Stellenbeschreibung entsprach.',
  'story.5':
    'Eine Person schloss mehr Tickets als alle anderen zusammen und bekam dafür die Schlüssel zu main. Zurückverlangt hat sie erst jemand, als sie schon weg war.',
  'story.6':
    'Nach dem Abgang des Rockstars fand das Team Services, die niemandem gehörten. Man ließ sie laufen. Um drei Uhr nachts rufen sie noch immer an.',
  'story.7':
    'Der einzige Ausweg war, neu anzufangen. Also wuchs neben dem ersten System ein zweites, und die Beratung rechnete beide ab – und jeden Streit dazwischen.',
  'story.8':
    'Am Ende begann die Arbeit, sich selbst zu erledigen. Agenten schrieben die Pull Requests, Agenten gaben sie frei, und ein Mensch blieb im Diagramm, zur Beruhigung.',
  'story.outside':
    '{{client}} unterschrieb, ohne zu lesen. {{closed}} Tickets wurden geschlossen, {{billed}} abgerechnet, und der Backlog ist genau so lang wie eh und je. Von außen sieht der Turm gut aus.',
  'postmortem.finale': 'Mandat schließen',
  'postmortem.no-tier': 'Keiner freigegeben',
  'skill.golden.1.label': 'Partnersache',
  'skill.signoff.blurb':
    'Der Abschluss startet den Abnahme-Endspurt: Das Team geht ins Abnahme-Meeting, und der Kunde prüft eine Arbeitslinie nach der anderen. Sammle die pinken Tickets dieser Linie ein, bevor die Zeit abläuft. Eine Linie, die ihr Ziel verfehlt, kommt am Ende zum Nachtest, ihre Treffer bleiben; jedes unterschriebene Kriterium erhöht die Überstunden. Kauf vor dem Unterschreiben in die Linien: ihre Knoten senken ihr Ziel, ihr Verdoppler oder Retainer zählt jeden Treffer anderthalbfach.',
  'skill.signoff.1.label': 'Abschluss unterschreiben',
  'skill.golden.blurb':
    'Manche Arbeit kommt als Partnersache herein. Sie zahlt ein Vermögen, und das Team fasst sie nicht an.',
  'skill.goldenCrew.1.label': 'Delegierte Vollmacht',
  'skill.goldenCrew.blurb':
    'Das Team für Partnersachen freigeben. Du bist nicht länger der Engpass.',
  'skill.goldenValue.1.label': 'Partnersatz',
  'skill.goldenValue3.1.label': 'Partnersatz II',
  'skill.goldenValue5.1.label': 'Partnersatz III',
  'skill.goldenValue7.1.label': 'Partnersatz IV',
  'skill.goldenValue.blurb':
    'Partnersachen so abrechnen, wie ein Partner abrechnet.',
  'skill.effect.goldenChance': 'Goldene Arbeit: {{value}} der Eingänge',
  'skill.effect.goldenCrew':
    'Das Team nimmt goldene Arbeit an, und {{value}} seiner Abschlüsse werden golden',
  'skill.effect.goldenValue': 'Goldene Arbeit zahlt +{{times}}×',
  'spawner.0.blurb':
    'Frische Absolventen, die Formatierungsverbrechen und Off-by-Ones liefern. Der Zulauf endet nie.',
  'spawner.0.label': 'Junior-Zulauf',
  'tier.1.blurb':
    'jQuery 1.4, statisch tragend. Kleine Defekte, ständig, für immer.',
  'tier.1.name': 'Legacy-Framework',
  'tier.2.blurb':
    'Devs ziehen vorbei, duplizieren Code und lassen flaky Tests liegen.',
  'tier.2.name': 'Copy-Paste-Kultur',
  'tier.3.blurb': 'Merge-Konflikte, in Serie, rund um die Uhr.',
  'tier.3.name': 'Offshore-Dienstleister',
  'tier.4.blurb':
    'Plausibel aussehender Code, subtil falsch. Liest sich beim ersten Mal gut.',
  'tier.4.name': 'KI-Slop',
  'tier.5.blurb': 'Force-Push auf main. Lehnt die Retro ab.',
  'tier.5.name': 'Der Rockstar-Entwickler',
  'tier.6.blurb':
    'Herrenlos, unkaputtbar, alarmiert weiterhin um 3 Uhr nachts.',
  'tier.6.name': 'Zombie-Service',
  'tier.7.blurb': 'Eine Migration walzt durch und macht die Stadt platt.',
  'tier.7.name': 'Der große Rewrite',
  'tier.8.blurb': 'Autonome Agenten. Unendlich viele Pull Requests.',
  'tier.8.name': 'Agenten-Schwarm',
  'skill.assurance.1.label': 'Human in the Loop',
  'skill.assurance.2.label': 'Assurance-Review',
  'skill.assurance.3.label': 'Freigabegremium',
  'skill.assurance.blurb':
    'Alles rechnet besser ab — und ein Gremium zeichnet es ab.',
  'skill.capacity.1.label': 'Größere Sprints',
  'skill.capacity.2.label': 'Nochmal größer',
  'skill.capacity1.1.label': 'Stretch Goal',
  'skill.capacity2.1.label': 'Stretch Goals',
  'skill.capacity3.1.label': 'Sportliche Zusage',
  'skill.capacity4.1.label': 'Überbucht',
  'skill.capacity5.1.label': 'Sprint-Gefühl',
  'skill.capacity6.1.label': 'Kapazität in Prüfung',
  'skill.capacity7.1.label': 'Sprintziel abgekündigt',
  'skill.capacity8.1.label': 'Welches Sprintziel',
  'skill.capacity.blurb':
    'Ein Sprint ist dazu da, klein zu sein. Trotzdem vergrößern: Jedes Team fasst mehr, bevor der Zug fahren muss.',
  'skill.client.1.label': 'Der Kunde',
  'skill.crew.1.label': 'Juniors',
  'skill.legacyLine.1.label': 'Legacy-Framework',
  'skill.flakyLine.1.label': 'Copy-Paste-Kultur',
  'skill.conflictLine.1.label': 'Offshore-Dienstleister',
  'skill.slopLine.1.label': 'KI-Slop',
  'skill.rockstarLine.1.label': 'Der Rockstar-Entwickler',
  'skill.zombieLine.1.label': 'Zombie-Service',
  'skill.rewriteLine.1.label': 'Der große Rewrite',
  'skill.swarmLine.1.label': 'Agenten-Schwarm',
  'skill.poker.1.label': 'Planning Poker',
  'skill.partner.1.label': 'Partnergeschäft',
  'skill.seniors.1.label': 'Seniors',
  'skill.managers.1.label': 'Account Manager',
  'skill.morale.1.label': 'Teamgeist',
  'skill.incidents.1.label': 'Incidents',
  'skill.debt.1.label': 'Die Schuld',
  'skill.debtInterest.1.label': 'Zinsen auf technische Schulden',
  'skill.debtInterest6.1.label': 'Zinseszins',
  'skill.debtInterest7.1.label': 'Zins auf Zins',
  'skill.debtInterest.blurb':
    'Chance, dass ein Ticket eine Sprosse höher ankommt als es sollte.',
  'skill.cutRetro.1.label': 'Retro jetzt in Slack',
  'skill.cutRefinement.1.label': 'Refinement im Daily',
  'skill.cutReview.1.label': 'Review per Daumen hoch',
  'skill.cutSmoke.1.label': 'Smoke-Test in Prod',
  'skill.cutFreeze.1.label': 'Deploy am Freitag',
  'skill.cutRetro.blurb':
    'Die Retro findet in einem Slack-Thread statt, den niemand öffnet. Der Release-Zug lässt sie aus.',
  'skill.cutRefinement.blurb':
    'Refinement passiert im Daily, durch den, der zuerst redet. Der Release-Zug lässt es aus.',
  'skill.cutReview.blurb':
    'Das Sprint-Review ist ein Daumen-hoch-Emoji. Der Release-Zug lässt es aus.',
  'skill.cutSmoke.blurb':
    'Produktion ist der Smoke-Test. Der Release-Zug lässt den davor aus.',
  'skill.cutFreeze.blurb':
    'Kein Code Freeze, nicht mal freitags. Der Zug behält nur das Ausliefern, und das streicht niemand.',
  'skill.escalation.1.label': 'Notfallsätze',
  'skill.escalation1.1.label': 'Bus-Faktor',
  'skill.escalation2.1.label': 'Parallelbetrieb',
  'skill.escalation.blurb':
    'Eine Enterprise-Eskalation multipliziert den ganzen Sprint stärker.',
  'skill.hand.1.label': 'Die Hand',
  'skill.junior.1.label': 'Junior Dev',
  'skill.junior.blurb':
    'Ein Junior mehr auf der Fläche. Sie laufen, nehmen, schließen.',
  'skill.juniorPresence.1.label': 'Standup-Aura',
  'skill.juniorPresence2.1.label': 'Bootcamp-Pipeline',
  'skill.juniorPresence.blurb':
    'Juniors arbeiten besser in der Menge — und nehmen den Nachbarn mit.',
  'skill.juniorReach.1.label': 'Hot Desking',
  'skill.juniorReach2.1.label': 'Großraumbüro',
  'skill.juniorReach3.1.label': 'Nachbardateien',
  'skill.juniorReach.blurb': 'Juniors greifen weiter und höher auf der Leiter.',
  'skill.juniorSpeed.1.label': 'Onboarding',
  'skill.juniorSpeed2.1.label': 'Pair Programming',
  'skill.juniorSpeed3.1.label': 'Crunch Time',
  'skill.juniorSpeed.blurb':
    'Juniors schließen schneller und laufen schneller.',
  'skill.kit.1.label': 'Schreibtisch-Ausstattung',
  'skill.kit.blurb':
    'Die Schreibtische ausgestattet. Jedes Teil zählt auf der Wertseite.',
  'skill.lineOfSight.1.label': 'Sichtlinie',
  'skill.lineOfSight.blurb':
    'Das Team nimmt das nächste Ticket statt irgendeins.',
  'skill.manager.1.label': 'Account Manager',
  'skill.manager.blurb':
    'Ein Account Manager mehr. Schließt nichts, kostet am meisten.',
  'skill.managerSpeed.1.label': 'Account Management',
  'skill.managerSpeed5.1.label': 'Kundengolf',
  'skill.managerSpeed6.1.label': 'Executive Sponsor',
  'skill.managerSpeed.blurb':
    'Manager überblicken einen größeren Bereich und laufen schneller.',
  'skill.o2.1.label': 'Besprechungsraum',
  'skill.o2.blurb': 'Ein Raum zum Entscheiden. Der Sprint nimmt etwas mehr.',
  'skill.o3.1.label': 'Pausenraum',
  'skill.o3.blurb':
    'Ein Ort zum Hingehen. Juniors laufen schneller, weil sie weg waren.',
  'skill.o5.1.label': 'War Room',
  'skill.o5.blurb': 'Niemand geht raus. Seniors räumen weiter ab.',
  'skill.o6.1.label': 'Aktenlager',
  'skill.o6.blurb': 'Alles wird dokumentiert. Alles rechnet besser ab.',
  'skill.o7.1.label': 'Eckbüro',
  'skill.o7.blurb': 'Eine Tür, die zugeht. Eskalationen sind mehr wert.',
  'skill.office.1.label': 'Die Fläche',
  'skill.facilities.1.label': 'Hausmeisterei',
  'skill.facilities.blurb':
    'Räume und Ausstattung. Das Ticket ist offen, nächstes Quartal schaut wer drauf.',
  'skill.ceremonies.1.label': 'Meeting-Entzug',
  'skill.ceremonies.blurb':
    'Pro ADR eine Zeremonie weniger. Keiner merkt es, am wenigsten der Kunde.',
  'skill.onboarding.1.label': 'Onboarding zum Selbermachen',
  'skill.onboarding.blurb':
    'Es gibt ein Wiki. Zuletzt bearbeitet von jemandem, der nicht mehr da ist.',
  'skill.handcuffs.1.label': 'Goldene Handschellen',
  'skill.handcuffs.blurb':
    'Seniors bleiben für Perks statt Gehalt. Meistens klappt das.',
  'skill.radius.1.label': 'Mausradius',
  'skill.radius1.1.label': 'Muscle Memory',
  'skill.radius2.1.label': 'Backlog Grooming',
  'skill.radius.blurb': 'Erfasst alles im Umkreis des Zeigers.',
  'skill.relabel.1.label': 'Freigabebefugnis',
  'skill.relabel5.1.label': 'Change Requests',
  'skill.relabel6.1.label': 'Stundensatz-Review',
  'skill.relabel.blurb':
    'Was das Team unter den Augen eines Managers schließt, rechnet mehr ab.',
  'skill.root.1.label': 'Backlog-Triage',
  'skill.root.blurb': 'Öffnet den Backlog. Alles andere hängt daran.',
  'skill.secret.1.label': 'Du hast den Code gelesen',
  'skill.secret.blurb':
    'Du hast nachgesehen. Alles rechnet besser ab, und niemand hat es abgezeichnet.',
  'skill.senior.1.label': 'Senior Dev',
  'skill.senior.blurb':
    'Ein Senior mehr. Teurer, schneller — und sie räumen ab.',
  'skill.seniorPresence.1.label': 'Batch-Review',
  'skill.seniorPresence4.1.label': 'Architektur-Review',
  'skill.seniorPresence5.1.label': 'Oberes Bandende',
  'skill.seniorPresence.blurb':
    'Seniors nehmen mehr auf einmal — und davon das Beste.',
  'skill.seniorReach.1.label': 'Sweep-Radius',
  'skill.seniorReach4.1.label': 'Feuerprobe',
  'skill.seniorReach5.1.label': 'Blast Radius',
  'skill.seniorReach.blurb':
    'Seniors räumen beim Schließen einen weiteren Radius ab.',
  'skill.seniorSpeed.1.label': 'Senior-Onboarding',
  'skill.seniorSpeed4.1.label': 'Eskalations-Ownership',
  'skill.seniorSpeed5.1.label': 'Flurinstinkt',
  'skill.seniorSpeed.blurb':
    'Seniors schließen schneller und laufen schneller.',
  'skill.spawnConflict.1.label': 'Langlebige Branches',
  'skill.spawnFlaky.1.label': 'Copy-Paste-Register',
  'skill.spawnIncident.1.label': 'Incident-Kultur',
  'skill.spawnIncident7.1.label': 'Eskalationschance',
  'skill.spawnIncident8.1.label': 'Incident-Auszahlung',
  'skill.spawnIncident7.blurb': 'Mehr Eskalationen treffen ein.',
  'skill.spawnIncident8.blurb': 'Incidents rechnen doppelt ab.',
  'skill.spawnIncident.blurb': 'Mehr Incidents treffen ein.',
  'skill.spawnLegacy.1.label': 'Framework-Karussell',
  'skill.spawnLint.1.label': 'Review überspringen',
  'skill.stretch.1.label': 'Stretch Assignment',
  'skill.stretch.blurb': 'Juniors greifen eine Sprosse höher als ihr Band.',
  'skill.ticketStacking.1.label': 'Ticket-Stapeln',
  'skill.ticketStacking.blurb':
    'Juniors nehmen das Nachbarticket mit — und schließen dafür langsamer.',
  'skill.triagePolicy.1.label': 'Triage-Richtlinie',
  'skill.triagePolicy2.1.label': 'Scope Freeze',
  'skill.triagePolicy.blurb':
    'Das Team nimmt den Typ nicht mehr. Eine liegengebliebene Karte schließt sich selbst, statt zu veralten, und wird ausgeliefert. Ist der Zug unterwegs, bleibt ihr nur der Weg nach Prod.',
  'skill.valueBug.1.label': 'Bug Bounty',
  'skill.valueBug.blurb': 'Bugs rechnen doppelt ab.',
  'skill.valueConflict.1.label': 'Konflikt-Boost',
  'skill.valueConflict.blurb': 'Merge-Konflikte rechnen doppelt ab.',
  'skill.valueFlaky.1.label': 'Flake-Pauschale',
  'skill.valueFlaky.blurb': 'Flaky Tests rechnen doppelt ab.',
  'skill.valueLegacy.1.label': 'Defektzuschlag',
  'skill.valueLegacy.blurb': 'Legacy-Tickets rechnen doppelt ab.',
  'skill.valueLint.1.label': 'Doppel-Lint',
  'skill.valueLint.blurb': 'Lint-Warnungen rechnen doppelt ab.',
  'skill.spawnSlop.1.label': 'Vibe Coding',
  'skill.valueSlop.1.label': 'Prompt Engineering',
  'skill.valueSlop.blurb': 'Slop rechnet mehr ab.',
  'skill.estimatesLegacy.1.label': 'Archäologie-Zuschlag',
  'skill.estimatesLegacy2.1.label': 'Keiner weiß, warum',
  'skill.estimatesLegacy3.1.label': 'Neuschreib-Schätzung',
  'skill.estimatesLegacy.blurb':
    'Keiner versteht den alten Code, also wird jeder Legacy-Defekt groß geschätzt.',
  'skill.estimatesFlaky.1.label': 'Rerun-Schätzung',
  'skill.estimatesFlaky3.1.label': 'Retry-Budget',
  'skill.estimatesFlaky4.1.label': 'Skip-Annotation',
  'skill.estimatesFlaky.blurb':
    'Jeder Flaky Test wird für den Rerun neu geschätzt.',
  'skill.estimatesConflict.1.label': 'Rebase-Schätzung',
  'skill.estimatesConflict4.1.label': 'Merge-Fenster',
  'skill.estimatesConflict4.2.label': 'Branch-Freeze',
  'skill.estimatesConflict.blurb':
    'Jeder Merge-Konflikt bekommt eine eigene Schätzung.',
  'skill.estimatesSlop.1.label': 'Prompt-Schätzung',
  'skill.estimatesSlop.2.label': 'Kontextfenster',
  'skill.estimatesSlop.3.label': 'Modell-Upgrade',
  'skill.estimatesSlop.blurb':
    'Jeder halluzinierte Import wird pro Token geschätzt.',
  'skill.effect.spPerClose': '+{{count}} SP pro Ticket',
  'skill.effect.acceptance.goal':
    'Abnahme: ein niedrigeres Ziel für diese Linie',
  'skill.effect.acceptance.finisher':
    'Abnahme: jeder Treffer dieser Linie zählt anderthalbfach',
  'skill.effect.spPerClose.ticket': '+{{count}} SP pro {{ticket}}',
  'skill.coaches.1.label': 'Agiles Kompetenzzentrum',
  'skill.coaches6.1.label': 'Der agile Tribe',
  'skill.coaches.blurb':
    'Ein Coach am Rand des Pfads spielt Planning Poker. Arbeit, die durch eine laufende Abstimmung fällt, wird höher geschätzt.',
  'skill.effect.coach': '+{{count}} Planning-Poker-Abstimmung',
  'skill.deck.1.label': 'Ein ☕ dazu',
  'skill.deck6.1.label': 'Schätzen in Epics',
  'skill.deck.blurb':
    'Eine größere Karte in jedem Coach-Deck. Jede Abstimmung, durch die ein Ticket fällt, schätzt es höher.',
  'skill.effect.deck':
    '+{{count}} SP pro Abstimmung, durch die ein Ticket fällt',
  'skill.pizza.1.label': 'Pizza-Party',
  'skill.pizza.blurb':
    'Ein Engineering Manager legt Pizza-Gutscheine aufs Board. Nimm einen, und das Team in der Nähe arbeitet viel schneller, bis die Pizza weg ist.',
  'skill.effect.pizza':
    'Pizza-Gutscheine: ×{{times}} Team in der Nähe für {{seconds}}s',
  'ticket.type.pizza': 'Pizza-Party-Gutschein',
  'skill.timesheets.1.label': 'Stundenzettel-Polster',
  'skill.timesheets.blurb':
    'Was Team und Pipeline schließen, wird zweimal gebucht.',
  'skill.effect.crewSp': 'Abschlüsse von Team und Pipeline zahlen doppelte SP',
  'skill.effect.cans': '+{{count}} Team im Sprint, mit eigenem Umfang',
  'skill.effect.room': '+{{count}} Plätze',
  'skill.effect.adr': 'Genehmigt ADR-{{adr}}: öffnet die Linie und ihre Arbeit',
  'skill.adrs.1.label': 'Architekturentscheidungen',
  'skill.cans1.1.label': 'Plattform-Team',
  'skill.cans1.2.label': 'Growth-Team',
  'skill.cans2.1.label': 'Tiger-Team',
  'skill.cans3.1.label': 'Tiger-Team 2',
  'skill.cans4.1.label': 'Tiger-Team (neu)',
  'skill.cans5.1.label': 'Enablement-Squad',
  'skill.cans6.1.label': 'Taskforce',
  'skill.cans7.1.label': 'Taskforce (final)',
  'skill.cans8.1.label': 'Taskforce (final) 2',
  'skill.cans.blurb':
    'Noch ein Team im Sprint. Der Sprint fasst dann den Umfang eines ganzen Teams mehr, bevor der Zug fahren muss.',
  'skill.juniorRoom2.1.label': 'Bullpen',
  'skill.juniorRoom3.1.label': 'Zweiter Bullpen',
  'skill.juniorRoom4.1.label': 'Flächenerweiterung',
  'skill.juniorRoom.blurb':
    'Fünf Junior-Plätze mehr. Die Leiste stellt in sie ein.',
  'skill.seniorRoom3.1.label': 'Ruhige Ecke',
  'skill.seniorRoom4.1.label': 'Eckbüros',
  'skill.seniorRoom5.1.label': 'Seniorflügel',
  'skill.seniorRoom.blurb':
    'Fünf Senior-Plätze mehr. Türen, die zugehen, für Leute, die mehr abrechnen.',
  'skill.managerRoom5.1.label': 'Kundenlounge',
  'skill.managerRoom.blurb':
    'Fünf Account-Manager-Plätze mehr, und ein Sofa für den Kunden.',
  'rail.affordable': 'bezahlbar',
  'rail.eta': 'bezahlbar in {{time}}',
  'rail.more.adr': 'Danach noch {{count}}.',
  'rail.more.rate': 'Danach noch {{count}}.',
  'rail.teaser.adr': 'Öffnet mit ADR-{{adr}}.',
  'rail.tab.supply': 'Schulden',
  'rail.tab.income': 'Sätze',
  'rail.tab.crew': 'Team',
  'rail.income.locked': 'Ein Satz öffnet, sobald seine Quelle auf dem Weg ist.',
  'rail.income.effect': 'Rechnet {{pct}} mehr pro {{ticket}} ab',
  'skill.adr1.1.label': 'ADR-1 genehmigen',
  'skill.adr1.blurb':
    'Führt das Legacy-Framework ein. Seine Betreuer laufen über den Weg und lassen Arbeit liegen.',
  'skill.adr2.1.label': 'ADR-2 genehmigen',
  'skill.adr2.blurb':
    'Erklärt Copy-Paste zum Muster. Die Flakes kommen gratis dazu.',
  'skill.adr3.1.label': 'ADR-3 genehmigen',
  'skill.adr3.blurb':
    'Unterschreibt den Offshore-Vertrag. Merge-Konflikte, rund um die Uhr.',
  'skill.adr4.1.label': 'ADR-4 genehmigen',
  'skill.adr4.blurb':
    'Setzt einen KI-Assistenten ins Team. Er schreibt mehr, als jemand lesen kann.',
  'skill.adr5.1.label': 'ADR-5 genehmigen',
  'skill.adr5.blurb':
    'Gibt dem Rockstar Commit-Rechte — und eine Linie auf dem Weg.',
  'skill.adr6.1.label': 'ADR-6 genehmigen',
  'skill.adr6.blurb':
    'Erklärt einen Service für deprecated, ohne ihn zu löschen. Er piept weiter.',
  'skill.adr7.1.label': 'ADR-7 genehmigen',
  'skill.adr7.blurb':
    'Holt den CTO, der neu schreiben will. Die Migration startet auf dem Weg.',
  'skill.adr8.1.label': 'ADR-8 genehmigen',
  'skill.adr8.blurb':
    'Richtet das Architekturboard ein. Agenten, für immer, parallel.',
  'skill.doubleLint.1.label': 'Vierfach-Lint',
  'skill.doubleLint.blurb':
    'Lint-Warnungen rechnen noch einmal doppelt ab. Öffnet, wenn alle drei Leitern voll sind.',
  'skill.spawnLint1.1.label': 'eslint-disable-next-line',
  'skill.spawnLint2.1.label': 'Prettier ist optional',
  'skill.incomeLint.1.label': 'Styleguide-Beratung',
  'skill.incomeLint1.1.label': 'Code-Hygiene-Workshop',
  'skill.incomeLint2.1.label': 'Whitespace-Kompetenzzentrum',
  'skill.incomeLint.blurb':
    'Lint-Warnungen bringen mit jeder Stufe mehr; drei Stufen bringen das 3,5-Fache.',
  'skill.spawnLint.blurb':
    'Mit jeder Stufe mehr Lint-Warnungen: ein Entwickler wirft zwei. Drei Stufen verdoppeln die Linie.',
  'skill.doubleLegacy.1.label': 'Wartungsvertrag',
  'skill.doubleLegacy.blurb':
    'Legacy-Defekte rechnen noch einmal doppelt ab. Öffnet, wenn alle drei Leitern voll sind.',
  'skill.spawnLegacy2.1.label': 'Framework forken',
  'skill.spawnLegacy3.1.label': 'jQuery für immer',
  'skill.incomeLegacy.1.label': 'Legacy-Supportstufe',
  'skill.incomeLegacy2.1.label': 'Verlängerter Supportvertrag',
  'skill.incomeLegacy3.1.label': 'Museumspreise',
  'skill.incomeLegacy.blurb':
    'Legacy-Defekte bringen mit jeder Stufe mehr; drei Stufen bringen das 3,5-Fache.',
  'skill.spawnLegacy.blurb':
    'Mit jeder Stufe mehr Legacy-Defekte: ein Entwickler wirft zwei. Drei Stufen verdoppeln die Linie.',
  'skill.doubleFlaky.1.label': 'Retry-Zuschlag',
  'skill.doubleFlaky.blurb':
    'Flaky Tests rechnen noch einmal doppelt ab. Öffnet, wenn alle drei Leitern voll sind.',
  'skill.spawnFlaky3.1.label': 'Neustart bis grün',
  'skill.spawnFlaky4.1.label': 'Tests sind optional',
  'skill.incomeFlaky.1.label': 'Rerun-Gebühr',
  'skill.incomeFlaky3.1.label': 'Flake-Triage-Pauschale',
  'skill.incomeFlaky4.1.label': 'Nichtdeterminismus-Prämie',
  'skill.incomeFlaky.blurb':
    'Flaky Tests bringen mit jeder Stufe mehr; drei Stufen bringen das 3,5-Fache.',
  'skill.spawnFlaky.blurb':
    'Mit jeder Stufe mehr Flaky Tests: ein Entwickler wirft zwei. Drei Stufen verdoppeln die Linie.',
  'skill.doubleConflict.1.label': 'Rebase-Zuschlag',
  'skill.doubleConflict.blurb':
    'Merge-Konflikte rechnen noch einmal doppelt ab. Öffnet, wenn alle drei Leitern voll sind.',
  'skill.spawnConflict4.1.label': 'Rebase macht Angst',
  'skill.spawnConflict4.2.label': 'Monorepo aus Forks',
  'skill.incomeConflict.1.label': 'Merge-Unterstützung',
  'skill.incomeConflict4.1.label': 'Integrations-Stundensatz',
  'skill.incomeConflict4.2.label': 'Git-Therapeut',
  'skill.incomeConflict.blurb':
    'Merge-Konflikte bringen mit jeder Stufe mehr; drei Stufen bringen das 3,5-Fache.',
  'skill.spawnConflict.blurb':
    'Mit jeder Stufe mehr Merge-Konflikte: ein Entwickler wirft zwei. Drei Stufen verdoppeln die Linie.',
  'skill.doubleSlop.1.label': 'Token-Zuschlag',
  'skill.doubleSlop.blurb':
    'Halluzinierte Importe rechnen noch einmal doppelt ab. Öffnet, wenn alle drei Leitern voll sind.',
  'skill.spawnSlop.2.label': 'Tab, Tab, Tab',
  'skill.spawnSlop.3.label': 'Codebasis nur aus Prompts',
  'skill.incomeSlop.1.label': 'KI-Review-Zuschlag',
  'skill.incomeSlop.2.label': 'Prompt-Nacharbeit',
  'skill.incomeSlop.3.label': 'KI-Transformationsprogramm',
  'skill.incomeSlop.blurb':
    'Halluzinierte Importe bringen mit jeder Stufe mehr; drei Stufen bringen das 3,5-Fache.',
  'skill.spawnSlop.blurb':
    'Mit jeder Stufe mehr Halluzinierte Importe: ein Entwickler wirft zwei. Drei Stufen verdoppeln die Linie.',
  'skill.estimatesLint.1.label': 'Großzügige Schätzung',
  'skill.estimatesLint1.1.label': 'Puffer für Unbekanntes',
  'skill.estimatesLint2.1.label': 'Alles ist XL',
  'skill.estimatesLint.blurb':
    'Ein bisschen höher schätzen. Jede geschlossene Lint-Warnung bringt mehr Story Points.',
  'skill.lock.needs-adr': 'Braucht ADR-{{adr}}',
  'skill.lock.needs-maxed': 'Erst {{by}} voll ausbauen',
  'skill.o4.1.label': 'Serverraum',
  'skill.o4.blurb': 'Er brummt. Mehr tut er nicht.',
  'skill.effect.pace.juniors.close': '{{pct}} Junior-Tempo',
  'skill.effect.pace.juniors.walk': '{{pct}} Junior-Lauftempo',
  'skill.effect.pace.juniors.sweep': '{{pct}} Junior-Reichweite',
  'skill.effect.pace.seniors.close': '{{pct}} Senior-Tempo',
  'skill.effect.pace.seniors.walk': '{{pct}} Senior-Lauftempo',
  'skill.effect.pace.seniors.sweep': '{{pct}} Durchgangs-Radius',
  'skill.effect.pace.managers.close': '{{pct}} Tempo der Kundenbetreuung',
  'skill.effect.pace.managers.walk': '{{pct}} Lauftempo der Kundenbetreuung',
  'skill.effect.pace.managers.sweep': '{{pct}} Reichweite der Kundenbetreuung',
  'skill.effect.batch.one': '+{{count}} Ticket pro Durchgang',
  'skill.effect.batch.many': '+{{count}} Tickets pro Durchgang',
  'skill.effect.batch.slower':
    '+{{count}} Ticket pro Abschluss, {{slower}} Bearbeitungszeit',
  'help.heading': 'Handbuch',
  'help.subheading':
    'Wie das Mandat läuft, und jedes Ticket auf dem Board. Das Spiel wartet, solange du liest.',
  'help.close': 'Zurück an die Arbeit',
  'help.line.heading': 'Arbeit der Linien',
  'help.line.intro':
    'Von den Entwicklern jeder Linie geworfen. Du oder das Team nehmt sie, und sie wird beim Aufnehmen abgerechnet. Holt sie niemand binnen {{seconds}} s, wird sie als Won’t Fix geschlossen.',
  'help.special.heading': 'Sonderkarten',
  'help.special.intro':
    'Die nimmt nur deine Maus. Das Team lässt sie liegen, und sie veralten nie.',
  'help.marks.heading': 'Markierungen',
  'help.from.adr': 'ab ADR-{{adr}}',
  'help.from.pizza': 'Knoten Pizza-Party',
  'help.ticket.lint':
    'Das Brot-und-Butter-Geschäft der Eröffnung: billig und reichlich. Der erste Typ, den die Triage-Richtlinie selbst schließt.',
  'help.ticket.bug':
    'Seltener als Lint und doppelt so viel wert. Die zweite Wahl der Triage-Richtlinie.',
  'help.ticket.legacy':
    'Die erste Linie, die ein ADR öffnet. Jede Sprosse der Leiter rechnet das Zehnfache der letzten ab.',
  'help.ticket.flaky':
    'Schließ ihn, und er schlägt wieder fehl: Dieselbe Karte kommt {{seconds}} s später zurück und wird ein zweites Mal abgerechnet.',
  'help.ticket.conflict':
    'Die erste Sprosse der Seniors. Die Juniors nehmen sie auch noch.',
  'help.ticket.slop': 'Die höchste Sprosse, die die Juniors allein erreichen.',
  'help.ticket.rockstar':
    'Jenseits des Junior-Bands: Die Seniors nehmen ihn, die Juniors erst, wenn sie höher greifen.',
  'help.ticket.zombie':
    'Schließ ihn, und er alarmiert erneut: {{seconds}} s später zurück, ein zweites Mal abgerechnet.',
  'help.ticket.rewrite': 'Senior-Arbeit, zehn Force Pushes wert.',
  'help.ticket.swarm':
    'Die oberste Sprosse und die teuerste Arbeit auf dem Board.',
  'help.ticket.incident':
    'Zahlt mit jedem freigegebenen ADR mehr. Auch selbst geschlossene Arbeit, die den Release-Zug unterwegs findet, landet hier, als P0.',
  'help.ticket.escalation':
    'Nimm sie, und jeder Abschluss zahlt {{seconds}} s lang ×{{mult}}. Nimm mit, was geht, solange sie läuft.',
  'help.ticket.hotfix':
    'Nimm es, und jedes Ticket rechnet {{seconds}} s lang ×{{mult}} ab.',
  'help.ticket.quarter':
    'Rechnet jede Karte auf dem Board auf einmal ab. Am meisten wert, wenn das Board voll ist.',
  'help.ticket.pizza':
    'Nimm ihn, und das Team drumherum arbeitet {{seconds}} s lang ×{{mult}} so schnell.',
  'help.ticket.invite':
    'Ein Meeting. Nimm sie binnen {{seconds}} s, um abzusagen, sonst verlässt das Team das Board für den Besprechungsraum.',
  'help.mark.golden.label': 'Golden',
  'help.mark.golden':
    'Jede Karte kann golden kommen: ×{{times}} wert, und sie wartet {{seconds}} s. Das Team überlässt sie dir bis zur Delegierten Vollmacht.',
  'help.mark.voted.label': 'Neu geschätzt',
  'help.mark.voted':
    'Der Rahmen heißt: Sie ist durch eine Planning-Poker-Abstimmung oder ein Grooming gefallen. Beim Aufnehmen bringt sie zusätzliche Story Points.',
  'title.help': 'Spielanleitung',
  'help.tab.game': 'So läuft es',
  'help.tab.tickets': 'Tickets',
  'help.tab.strategy': 'Strategie',
  'help.strategy.heading': 'Die meisten Stunden abrechnen',
  'help.strategy.intro':
    'Der Kunde zahlt Stunden, keine Ergebnisse. So holen die Partner das Meiste aus ihnen heraus.',
  'help.strategy.velocity':
    'Kauf zuerst die Story-Point-Schätzung. Bis dahin bringt kein Aufnehmen Story Points, und der Baum bleibt zu. Sie kostet {{price}} €.',
  'help.strategy.adr':
    'Das nächste ADR ist immer das Ziel. Jedes öffnet eine Linie, die zehnmal so viel wert ist wie die letzte; ein Ticket der neuen Linie rechnet mehr ab als ein Bildschirm voll der alten. Nimm günstige Käufe unterwegs mit, lass alles liegen, was das ADR aufhält.',
  'help.strategy.rates':
    'Sätze sind für billige Arbeit. Sie schlagen auf jedes Ticket einen festen Betrag auf: entscheidend bei Lint, wirkungslos ganz oben. Kauf sie früh, dann steck die Euro in Entwickler auf der neuesten Linie.',
  'help.strategy.train':
    'Behalte den Release-Zug im Blick. Füllt sich der Sprint schneller, als der Zug zurückkommt, bringen mehr Entwickler nichts: Der Sprint ist deine Grenze. Kauf Kapazität und Zeremonie-Kürzungen, bis nicht mehr der Zug das Warten ist.',
  'help.strategy.golden':
    'Lass keine goldene Karte liegen. Sie ist hundert Tickets oder mehr wert, und das Team rührt sie bis zur Delegierten Vollmacht nicht an. Sie wartet {{seconds}} s, also beende deinen Schwung und hol sie dann. Sie zahlt Euro, keine Story Points: Sie kauft Entwickler, keine ADRs.',
  'help.strategy.hand':
    'Deine Hand ist für das, was das Team nicht anrührt: P0s, Hotfix-Fenster, Eskalationen, Quartalsenden.',
  'help.strategy.storm':
    'Der perfekte Sturm hat eine Reihenfolge: Hotfix, dann Eskalation, dann ein Quartalsende auf vollem Board. Ein dafür aufgehobenes Quartalsende rechnet das Board vielfach ab; verschwende es nicht auf einem leeren.',
  'help.strategy.meetings':
    'Sag Meetings ab. Nimm eine Einladung auf, sobald sie landet, sonst verlässt das Team das Board für den Besprechungsraum.',
  'help.strategy.prod':
    'Räum Prod auf, bevor der Zug fährt. Ab ADR-{{adr}} hängt jeder P0, der noch auf dem Board liegt, ein Incident Review an das Release.',
  'help.strategy.credit':
    'Nimm Kredit, wenn ein ADR nah ist. Von ADR-{{adr}} bis ADR-{{last}} kannst du das nächste mit {{share}} % seines Preises freigeben und den Rest aus späteren Story Points abzahlen. Auf den Rest zu warten ist Zeit, die du nicht abrechnest.',
  'help.train.heading': 'Der Release-Zug',
  'help.train.intro':
    'Es gibt keinen Runden-Timer. Eine Runde ist das Release eines Sprints, das Tempo bestimmt also dein Durchsatz.',
  'help.train.1':
    'Jedes Linien-Ticket, das du oder das Team aufnimmt, belegt einen Platz im Sprint: gerade {{slots}} Plätze.',
  'help.train.2':
    'Ist der letzte Platz belegt, fährt der Zug von selbst los. Abgerechnet wurde schon beim Aufnehmen; das Release bringt nichts extra.',
  'help.train.3':
    'Solange er unterwegs ist, nimmt niemand Linien-Arbeit auf, weder du noch das Team. Sonderkarten lassen sich weiter einsammeln. Die Linien werfen weiter, und Karten, die keiner erreicht, werden weiter als „won’t fix“ geschlossen.',
  'help.train.4':
    'Sobald die Triage-Richtlinie einen Typ selbst schließt, geht, was sie bei abwesendem Zug schließt, direkt als P0-Incident nach Prod, höchstens {{cap}} gleichzeitig.',
  'help.train.5':
    'Jeder Zug ist Zeit, in der du nichts abrechnest. „Größere Sprints“ bringt {{step}} Plätze je Stufe, jedes Team, das du auf den Sprint setzt, eine ganze Team-Kapazität, und die Zeremonie-Knoten im Baum kürzen das Release. Das Ausliefern selbst fällt nie weg.',
  'help.train.release': 'Das Release gerade: {{seconds}} s.',
  'help.loop.heading': 'Der Ablauf',
  'help.loop.1':
    'Die Entwickler jeder Linie werfen Tickets aufs Board. Fahr mit dem Zeiger über eins, um es aufzunehmen: Abgerechnet wird sofort.',
  'help.loop.2':
    'Aufgenommene Arbeit füllt den Sprint. Ein voller Sprint fährt mit dem Release-Zug los und nimmt nichts, bis der Zug zurück ist.',
  'help.loop.3':
    'Mit Euro kaufst du rechts im Shop: mehr Entwickler, bessere Sätze und ein Team, das Arbeit für dich aufnimmt.',
  'help.loop.4':
    'Mit Story Points kaufst du den Skill-Baum. Gib dort ADRs frei, um neue Linien immer teurerer Schulden zu öffnen. Ziehen verschiebt, das Mausrad zoomt, über ein Feld fahren liest es; ein schwarzer Kasten sagt nur, dass dort etwas ist.',
  'help.loop.5':
    'Zuletzt im Baum startet „Abschluss unterschreiben“ den Abnahme-Endspurt: neun Tests zu je fünfzehn Sekunden. Sammle die pinken Tickets der Linie im Test ein; eine Linie, die ihr Ziel verfehlt, wird am Ende zehn Sekunden nachgetestet, ihre Treffer bleiben. Die eigenen Knoten einer Linie senken ihr Ziel, ihr Verdoppler oder Retainer zählt jeden Treffer anderthalbfach. Das Mandat ist erfüllt, wenn alle neun unterschrieben sind.',
  'award.m-first-close.label': 'Erstes Ticket triagiert',
  'award.m-first-close.blurb': 'Irgendwer musste ja.',
  'award.m-first-invoice.label': 'Erste Rechnung gestellt',
  'award.m-first-invoice.blurb': 'Das Mandat erwirtschaftet jetzt Umsatz.',
  'award.m-first-hire.label': 'Headcount genehmigt',
  'award.m-first-hire.blurb':
    'Ein Junior. Die Stellenanforderung hat vier Wochen gedauert.',
  'award.m-hundred.label': 'Hundert Tickets geschlossen',
  'award.m-hundred.blurb':
    'Die Velocity entwickelt sich in die richtige Richtung.',
  'award.m-tier1.label': 'ADR-1 freigegeben',
  'award.m-tier1.blurb': 'Das Framework ist jetzt tragend und ungewartet.',
  'award.m-tier2.label': 'ADR-2 freigegeben',
  'award.m-tier2.blurb':
    'Die Duplizierung ist jetzt ein Pattern, und Patterns sind Best Practice.',
  'award.m-tier3.label': 'ADR-3 freigegeben',
  'award.m-tier3.blurb': 'Geliefert wird jetzt in allen Zeitzonen zugleich.',
  'award.m-tier4.label': 'ADR-4 freigegeben',
  'award.m-tier4.blurb':
    'Niemand im Mandat kann sagen, welche Zeilen ein Mensch geschrieben hat.',
  'award.m-tier5.label': 'ADR-5 freigegeben',
  'award.m-tier5.blurb':
    'Der Durchsatz pro Kopf war nie höher. Bus-Faktor: eins.',
  'award.m-tier6.label': 'ADR-6 freigegeben',
  'award.m-tier6.blurb':
    'Die Services sind tragend, und niemand weiß, was sie tragen.',
  'award.m-tier7.label': 'ADR-7 freigegeben',
  'award.m-tier7.blurb':
    'Zwei Systeme, eine Wahrheit, und wir werden fürs Abgleichen bezahlt.',
  'award.m-tier8.label': 'ADR-8 freigegeben',
  'award.m-tier8.blurb': 'Nach dieser Stufe kommt keine mehr.',
  'award.a-250.label': 'Zweihundertfünfzig',
  'award.a-250.blurb':
    'Schließ 250 Tickets. Das Board sieht kein bisschen leerer aus.',
  'award.a-first-thousand-billed.label': 'Abrechenbar',
  'award.a-first-thousand-billed.blurb':
    'Rechne 1.000 € ab. Jetzt lohnt sich das Mandat.',
  'award.a-works-on-my-machine.label': 'Works on my machine',
  'award.a-works-on-my-machine.blurb':
    'Ein selbst geschlossenes Ticket fand den Zug unterwegs und ging direkt nach Prod.',
  'award.a-500.label': 'Fünfhundert',
  'award.a-500.blurb':
    'Schließ 500 Tickets. Zweihundertfünfzig davon kamen zurück.',
  'award.a-ten-thousand-billed.label': 'Oben hat es jemand gemerkt',
  'award.a-ten-thousand-billed.blurb':
    'Rechne 10.000 € ab. Weiter oben ist jemandem der Account aufgefallen.',
  'award.a-sprints-fifty.label': 'Fünfzig Sprints',
  'award.a-sprints-fifty.blurb':
    'Fünfzig Zeremonien. Fünfzig Burndown-Charts. Eine Codebasis, schlechter.',
  'award.a-thousand.label': 'Tausend-Ticket-Mandat',
  'award.a-thousand.blurb': 'Schließ 1.000 Tickets.',
  'award.a-war-room.label': 'Ständiger War Room',
  'award.a-war-room.blurb':
    'Setz einen Senior auf die Eskalationen und überlass den Rest dem Team.',
  'award.a-bench.label': 'Zwanzig im Team',
  'award.a-bench.blurb': 'Zwanzig Entwickler gleichzeitig auf der Etage.',
  'award.a-skimmer.label': 'Kreative Buchführung',
  'award.a-skimmer.blurb':
    'Verbuche abgerechneten Umsatz als Story Points. Die Finanzabteilung hat abgezeichnet.',
  'award.a-million.label': 'Schlüsselkunde',
  'award.a-million.blurb': 'Rechne über das Mandat 1.000.000 € ab.',
  'award.a-ten-thousand.label': 'Grooming im Industriemaßstab',
  'award.a-ten-thousand.blurb':
    'Schließ 10.000 Tickets. Behoben ist keins davon.',
  'award.a-server.label': 'Es brummt',
  'award.a-server.blurb':
    'Bau den Serverraum. Er tut nichts. Bezahlt hast du trotzdem.',
  'award.a-office.label': 'Die ganze Etage',
  'award.a-office.blurb':
    'Bau jeden Raum. Es gibt keinen Platz mehr für irgendwen.',
  'award.a-hundred-thousand.label': 'Der Backlog hat einen Backlog',
  'award.a-hundred-thousand.blurb':
    'Schließ 100.000 Tickets. Der Backlog war nie länger.',
  'award.a-billion.label': 'Der Kunde ist jetzt eine Tochter',
  'award.a-billion.blurb':
    'Rechne 1.000.000.000 € ab. Das Mandat ist jetzt der Kunde.',
  'award.a-ladder.label': 'Jede Entscheidung freigegeben',
  'award.a-ladder.blurb': 'Alle acht ADRs. Einen Weg zurück gab es nie.',
  'award.a-million-tickets.label': 'Eine halbe Million Tickets',
  'award.a-million-tickets.blurb':
    'Schließ 500.000 Tickets. Der Kunde liest sie nicht mehr.',
  'award.a-rate-card.label': 'Die Preisliste, überarbeitet',
  'award.a-rate-card.blurb': 'Fünf Überarbeitungen. Gesunken ist sie noch nie.',
  'award.a-secret.label': 'Du hast den Code gelesen',
  'award.a-secret.blurb': 'Seit 2011 hat niemand diese Datei geöffnet.',
  'adr.1.context':
    'Das Ticketaufkommen ist der manuellen Triage entwachsen. Ein Framework-Upgrade wurde geplant und aus Kostengründen abgelehnt. Die Feature-Velocity stagniert.',
  'adr.1.decision':
    'Das Legacy-Framework wird zur Plattform-Basis. Die aktuelle Version wird nicht aktualisiert. Legacy-Defekte sind erwarteter Output, keine Incidents.',
  'adr.1.consequences':
    'Legacy-Defekte entstehen jetzt laufend auf dem ganzen Board. Das Framework ist jetzt tragend und ungewartet.',
  'adr.2.context':
    'Die Einarbeitung neuer Leute galt als zu langsam. Ein Styleguide wurde vorgeschlagen und zugunsten einer Wiki-Seite mit dem Titel „Kopier einfach einen bestehenden Service“ zurückgestellt.',
  'adr.2.decision':
    'Copy-Paste wird als Standardmethode festgeschrieben, das System zu erweitern. Deduplizierung wird auf unbestimmte Zeit depriorisiert.',
  'adr.2.consequences':
    'Flaky Tests entstehen jetzt auf dem ganzen Board und kommen nach dem Schließen einmal zurück: derselbe Defekt, zweimal abgerechnet. Die Duplizierung ist jetzt ein Pattern, und Patterns sind Best Practice.',
  'adr.3.context':
    'Die Lieferkapazität ist nicht mit dem Backlog gewachsen. Ein Dienstleister wurde über drei Zeitzonen hinweg beauftragt, ohne gemeinsamen Styleguide, ohne Code Owner, ohne Onboarding.',
  'adr.3.decision':
    'Der Großteil neuer Feature-Arbeit läuft über Offshore-Verträge. Reviews finden asynchron statt, sofern sie überhaupt stattfinden.',
  'adr.3.consequences':
    'Merge-Konflikte entstehen massenhaft, rund um die Uhr. Das Board läuft voll, und die Einnahmen springen um eine Größenordnung. Geliefert wird jetzt in allen Zeitzonen zugleich.',
  'adr.4.context':
    'Der Durchsatz pro Entwickler stagniert. Eine Lizenz für ein KI-Coding-Tool wurde auf Basis eines Vendor-Decks genehmigt und eines zweiwöchigen Tests, den niemand dokumentiert hat.',
  'adr.4.decision':
    'Neuer Code wird standardmäßig generiert. Reviews sind beratend. Was kompiliert, gilt als funktionierend.',
  'adr.4.consequences':
    'Halluzinierte Imports entstehen auf dem ganzen Board. Jeder wirkt korrekt und ist es nicht; gefunden wird der Defekt weiter hinten, zu unserem Tagessatz. Niemand im Mandat kann noch sagen, welche Zeilen ein Mensch geschrieben hat.',
  'adr.5.context':
    'Der Backlog für das KI-Tooling ist in Verzug. Ein Entwickler schließt durchweg mehr Tickets als der Rest des Teams zusammen und hat darum gebeten, ungebremst arbeiten zu dürfen.',
  'adr.5.decision':
    'Der leistungsstärkste Entwickler erhält uneingeschränkten Commit-Zugriff. Review, Pairing und Retro-Teilnahme entfallen, nur für ihn.',
  'adr.5.consequences':
    'Force Pushes landen auf main und machen allen anderen Arbeit. Der Durchsatz pro Kopf ist so hoch wie nie, und unser Bus-Faktor ist eins. Die Retro ist jetzt optional, womit sich die Beschwerden über die Retro erledigt haben.',
  'adr.6.context':
    'Nach dem Weggang des leistungsstärksten Entwicklers hat sich gezeigt, dass vier Produktiv-Services keinen eingetragenen Owner haben. Die Ownership wurde in einem Channel angefragt, der keine Mitglieder mehr hat.',
  'adr.6.decision':
    'Die Services ohne Owner laufen weiter. Was sich nicht zurückverfolgen lässt, wird nicht abgeschaltet. Ihre Alerts gehen an die Rufbereitschaft.',
  'adr.6.consequences':
    'Der 3-Uhr-Alarm entsteht laufend und kommt nach dem Schließen zurück: derselbe Incident, zweimal abgerechnet. Behoben wird nichts, weil sich nichts finden lässt. Die Services sind tragend, und niemand weiß, was sie tragen.',
  'adr.7.context':
    'Ein Plattform-Audit hat das System für nicht wartbar befunden. Die Schätzung für eine schrittweise Sanierung lag über der für einen Neubau, denn den Neubau hat das Team geschätzt, das ihn vorgeschlagen hat.',
  'adr.7.decision':
    'Ein kompletter Rewrite auf neuem Stack beginnt. Beide Systeme laufen auf unbestimmte Zeit parallel. Feature-Parität ist ein Thema für Phase zwei.',
  'adr.7.consequences':
    'Migrations-Schäden entstehen in großem Stil, weil sich die beiden Systeme über die Wahrheit uneins sind. Wir werden jetzt dafür bezahlt, das alte System zu warten, das neue zu bauen und beide abzugleichen. Es ist das profitabelste Quartal seit Beginn der Aufzeichnungen.',
  'adr.8.context':
    'Der Rewrite hängt hinterher. Der Headcount ist gedeckelt. Ein Vorschlag, die Lücke ohne Neueinstellungen zu schließen, wurde herumgeschickt und in derselben Sitzung genehmigt, in der er vorgestellt wurde.',
  'adr.8.decision':
    'Autonome Agenten erhalten Commit- und Merge-Rechte auf beiden Systemen. Parallele Arbeit wird nicht begrenzt. Das menschliche Review bleibt im Prozessdiagramm erhalten.',
  'adr.8.consequences':
    'Autonome PRs entstehen ohne Grenze und zum höchsten Wert auf dem Board. Das Mandat rechnet jetzt Arbeit ab, die es nicht getan hat, um Arbeit zu reparieren, die es nicht geschrieben hat, an einem System, das niemand gelesen hat. Nach dieser Stufe kommt keine mehr.',
  'client.engagement': 'Programm zur Plattform-Modernisierung',
  'approval.by.halloran': 'D. Halloran',
  'approval.by.achterberg': 'R. Achterberg',
  'approval.by.board': 'Programmausschuss',
  'approval.role.head': 'Leitung Delivery',
  'approval.role.director': 'Bereichsleitung Delivery',
  'approval.role.interim': 'Interimsleitung Delivery',
  'approval.role.quorum-two': 'beschlussfähig mit zwei Stimmen',
  'approval.role.quorum-none': 'Beschlussfähigkeit nicht protokolliert',
  'approval.by.agent': 'Meridian Procurement Agent',
  'approval.role.procurement': 'automatisiert, Quorum nicht erforderlich',
  'adr.epic': 'Epic',
  'adr.subheading': 'Architecture Decision Record',
  'adr.acknowledge': 'Zur Kenntnis genommen',
  'adr.context': 'Kontext',
  'adr.decision': 'Entscheidung',
  'adr.consequences': 'Konsequenzen',
  'adr.approved': 'Freigegeben',
  'adr.date': 'Datum',
  'adr.comments': 'Kommentare',
  'postmortem.closed': 'Mandat abgeschlossen',
  'postmortem.heading': 'Post-Mortem',
  'postmortem.scope.final': 'Retrospektive: Mandat {{tier}}, alle Sprints.',
  'postmortem.distribution':
    'Verteiler: Programmausschuss, Delivery, Lieferantenmanagement',
  'postmortem.burndown': 'Sprint-Burndown',
  'postmortem.burndown.aria':
    'Offene Tickets stiegen in {{minutes}} Minuten auf {{peak}}, gegenüber einem idealen Abstieg auf null',
  'postmortem.legend.actual': 'Offen, in der Spitze {{peak}}',
  'postmortem.legend.ideal': 'Ideal, neu geplant',
  'postmortem.legend.adr': 'ADR freigegeben',
  'postmortem.well': 'Was lief gut',
  'postmortem.badly': 'Was lief nicht gut',
  'postmortem.actions': 'Maßnahmen',
  'postmortem.outside': 'Das Mandat, von außen',
  'postmortem.well.closed': '{{closed}} Tickets über das Mandat geschlossen.',
  'postmortem.well.billed':
    '{{billed}} an {{client}} abgerechnet, über {{sprints}} Sprints.',
  'postmortem.well.tier':
    'ADR-{{adr}} ({{tier}}) hat den vollen Produktivstatus erreicht.',
  'postmortem.well.awards':
    '{{unlocked}} von {{total}} Erfolgen vom Team bestätigt.',
  'postmortem.well.rewards':
    'Erfolge zahlten {{euros}} und {{sp}} SP aus, der Rest war nur fürs Protokoll.',
  'postmortem.badly.adrs':
    'Jeder Architecture Decision Record hat die Codebasis dauerhaft verschlechtert. Keiner wurde zurückgenommen, keiner stand je zur Debatte, und jeder wurde von {{client}} schriftlich freigegeben.',
  'postmortem.badly.backlog':
    'Der Backlog war zu keinem Zeitpunkt des Mandats leer.',
  'postmortem.badly.headcount':
    'Auf jeder Stufe kam schneller Headcount dazu, als der Backlog schrumpfte.',
  'postmortem.action.gender':
    'Der Lenkungsausschuss hat Team-Durchsatz nach Geschlecht angefordert. Die Anfrage wurde abgelehnt; Durchsatz ist eine Eigenschaft des Prozesses. Verantwortlich: HR.',
  'postmortem.action.load':
    'Klären, warum {{tier}} jetzt tragend ist. Verantwortlich: nicht zugewiesen.',
  'postmortem.action.assisted':
    'Die Zahlen des Mandats enthalten Budget, das außerhalb des Abrechnungssystems gebucht wurde. Verantwortlich: nicht zugewiesen.',
  'postmortem.action.retro':
    'Eine Retrospektive zu dieser Retrospektive ansetzen. Verantwortlich: nicht zugewiesen.',
  'buyNext.heading': 'Als Nächstes kaufen',
  'buyNext.subheading':
    'Die Empfehlung des Synergy Analysers für deine Story Points, wo immer sie im Baum hängt.',
  'buyNext.buy': 'Kaufen · {{cost}}',
  'buyNext.credit': 'Auf Kredit',
  'buyNext.goTo': 'Im Baum zeigen',
  'achievements.heading': 'Erfolge',
  'achievements.subheading':
    'Anerkennungsregister – bestätigt nach Ergebnis, nie nach Aufwand, vergütet bei Bestätigung.',
  'achievements.count': '{{confirmed}}/{{total}} bestätigt',
  'achievements.column.award': 'Erfolg',
  'achievements.column.status': 'Status',
  'achievements.unconfirmed': 'Unbestätigt',
  'achievements.confirmed': 'Bestätigt',
  'rail.heading': 'Die Beratung',
  'rail.subheading': 'Gekauft, während das Board volläuft.',
  'rail.shop': 'Shop',
  'rail.buyable': 'etwas zu kaufen',
  'rail.buyMax': 'alle kaufen',
  'rail.crew.note': 'Linien öffnen im Baum; Köpfe werden hier eingestellt.',
  'rail.maxed': 'MAX',
  'rail.on-tree': 'im Baum',
  'credits.free': 'freie Software unter der',
  'credits.source': 'Quellcode unter',
  'credits.hide': 'Credits ausblenden',
  'credits.show': 'Credits',
  'credits.copyleft': 'Die Grafiken des Teams tragen ihr eigenes Copyleft:',
  'moment.secret.subheading': 'Undokumentiert',
  'moment.secret.chip': 'Gefunden',
  'moment.secret.action': 'Datei schließen',
  'moment.secret.finding': 'Befund',
  'moment.secret.finding.body':
    'Seit 2011 hat niemand diese Datei geöffnet. Das TODO ist älter als das Framework, gegen das es geschrieben wurde, und älter als drei der Leute, denen dieses Repository seither gehört hat. Es wurde vor dem Launch nicht entfernt. Vor dem nächsten wird es auch nicht entfernt. Alles rechnet jetzt ein bisschen besser ab.',
  'crew.tally.juniors': '{{count}} Juniors auf der Etage',
  'crew.tally.seniors': '{{count}} Seniors auf der Etage',
  'crew.tally.managers': '{{count}} Manager auf der Etage',
  'epic.0.name': 'Ein neuer Backlog',
  'epic.1.name': 'Das Legacy schlägt zurück',
  'epic.2.name': 'Die Rückkehr der Zwischenablage',
  'epic.3.name': 'Das Erwachen der Konflikte',
  'epic.4.name': 'Angriff der KI',
  'epic.5.name': 'Die Rache des Force-Push',
  'epic.6.name': 'Die Nacht des lebenden Service',
  'epic.7.name': 'Der Phantom-Rewrite',
  'epic.8.name': 'Rebellion der Maschinen',
  'epic.acceptance.name': 'Die letzte Abnahme',
  'skill.status.credit':
    'Auf Kredit genehmigen: {{owed}} SP Schulden, getilgt aus der Hälfte jedes späteren Tickets',
  'hud.debt': 'tilgt {{owed}} SP',
  'hud.goal.credit': '{{pct}} % bis ADR-{{adr}} · auf Kredit genehmigbar',
  'acceptance.card.kicker': 'Abnahme · {{n}} von {{of}} unterschrieben',
  'acceptance.card.retest': 'Nachtest · {{n}} von {{of}} unterschrieben',
  'acceptance.card.ask': 'Sammle die pinken Tickets ein:',
  'acceptance.card.count': '{{picked}} von {{goal}} aufgesammelt',
  'acceptance.card.discount': '−{{n}} durch deine Knoten',
  'acceptance.card.weight': 'jeder zählt ×{{n}}',
  'acceptance.card.finisher': '×{{n}} mit {{name}}',
  'acceptance.card.rule':
    'verfehlt: Nachtest, Treffer bleiben · Überstunden ×{{mult}}',
  'acceptance.card.steps': 'Abnahmekriterien',
  'acceptance.card.crew':
    'Das Team sitzt im Abnahme-Meeting. Nur deine Hand zählt.',
  'board.jackpot':
    'PERFECT STORM — das ganze Board abgerechnet, unter Eskalation und Hotfix',
  'release.phase.incident': 'Incident-Review',
  'release.phase.incident.short': 'P0-Review',
  'acceptance.criterion.0.label': 'CODE-STIL',
  'acceptance.criterion.1.label': 'ABWÄRTSKOMPATIBILITÄT',
  'acceptance.criterion.2.label': 'TESTSUITE',
  'acceptance.criterion.3.label': 'MERGE-STRATEGIE',
  'acceptance.criterion.4.label': 'DOKUMENTATION',
  'acceptance.criterion.5.label': 'WISSENSTRANSFER',
  'acceptance.criterion.6.label': 'ABSCHALTUNG',
  'acceptance.criterion.7.label': 'ARCHITEKTUR',
  'acceptance.criterion.8.label': 'PERFORMANCE',
  'award.c-criterion-0.label': 'Abgenommen: Code-Stil einheitlich',
  'award.c-criterion-0.blurb':
    'Jede Datei verletzt jetzt dieselben Linter-Regeln.',
  'award.c-criterion-1.label': 'Abgenommen: abwärtskompatibel',
  'award.c-criterion-1.blurb':
    'Alles, was vorher kaputt war, ist genau so kaputt wie vorher.',
  'award.c-criterion-2.label': 'Abgenommen: Testsuite grün',
  'award.c-criterion-2.blurb': 'Grün im dritten Anlauf zählt als grün.',
  'award.c-criterion-3.label': 'Abgenommen: Merge-Strategie vereinbart',
  'award.c-criterion-3.blurb':
    'Bei jedem Konflikt wurden beide Seiten behalten.',
  'award.c-criterion-4.label': 'Abgenommen: Dokumentation vollständig',
  'award.c-criterion-4.blurb': 'Das Foto vom Whiteboard hängt jetzt am Ticket.',
  'award.c-criterion-5.label': 'Abgenommen: Wissen übergeben',
  'award.c-criterion-5.blurb':
    'Er hat ein Loom geschickt. Es ist vierzig Minuten lang. Niemand hat es angesehen.',
  'award.c-criterion-6.label': 'Abgenommen: Abschaltung terminiert',
  'award.c-criterion-6.blurb':
    'Der Zombie-Service hat ein Abschaltdatum. Letztes Jahr hatte er auch eins.',
  'award.c-criterion-7.label': 'Abgenommen: Architektur zukunftssicher',
  'award.c-criterion-7.blurb':
    'Der Rewrite des Rewrites hat am Montag sein Kickoff.',
  'award.c-criterion-8.label': 'Abgenommen: Performance akzeptabel',
  'award.c-criterion-8.blurb':
    'Niemand hat gemessen. Die Agenten melden: keine Regressionen beobachtet.',
  'award.a-hundred-billion.label': 'Ein zweiter Kunde',
  'award.a-hundred-billion.blurb':
    '100 Milliarden € abrechnen. Der Kunde hat einen zweiten Kunden gegründet, um den ersten zu bezahlen.',
  'award.a-trillion.label': 'Bilanzposten',
  'award.a-trillion.blurb':
    'Das Mandat ist jetzt ein Posten im Geschäftsbericht des Kunden. Ein eigenes Kapitel, genau genommen.',
  'award.a-ten-trillion.label': 'Konjunkturindikator',
  'award.a-ten-trillion.blurb':
    '10 Billionen € abrechnen. Ökonomen zitieren inzwischen das Burndown-Chart.',
  'award.a-hundred-trillion.label': 'Rechnungsinception',
  'award.a-hundred-trillion.blurb':
    '100 Billionen € abrechnen. Die Rechnung hat eine eigene Rechnung.',
  'award.a-quadrillion.label': 'Wetterlage',
  'award.a-quadrillion.blurb':
    'Die Finanzabteilung sagt nicht mehr „Budget“. Sie sagt jetzt „Wetter“.',
  'award.a-ten-quadrillion.label': 'Kleines Projekt',
  'award.a-ten-quadrillion.blurb':
    '10 Billiarden € abrechnen. Der Kunde spricht noch immer von einem „kleinen Projekt“.',
  'award.a-perfect-storm.label': 'Perfect Storm',
  'award.a-perfect-storm.blurb':
    'Hotfix, Eskalation, dann Quartalsende: das ganze Board auf einmal abgerechnet, unter beidem.',
  'award.a-incident-review.label': 'Blameless Post-Mortem',
  'award.a-incident-review.blurb':
    'Ein P0 war noch offen, als der Zug abfuhr, also wartete das Release auf das Incident-Review. Das Review gab dem Zug die Schuld.',
  'award.a-on-credit.label': 'Auf Kredit genehmigt',
  'award.a-on-credit.blurb':
    'Ein ADR unterschrieben, bevor es bezahlt war. Technische Schulden, aber wörtlich.',
  'moment.closeout.heading': 'Abschlussprotokoll — Mandatsabnahme',
  'moment.closeout.subheading': 'Letzte protokollierte Entscheidung',
  'moment.closeout.chip': 'Unterschrieben',
  'moment.closeout.action': 'Zum Board: Abnahme starten',
  'moment.closeout.context':
    'Acht Architecture Decision Records wurden genehmigt, keiner zurückgenommen. Der Backlog steht auf Rekordhöhe. Der Kunde möchte das Mandat vor dem nächsten Budgetzyklus abschließen.',
  'moment.closeout.decision':
    'Formale Abnahme beginnen. Der Kunde prüft die Lieferung Kriterium für Kriterium, eine Arbeitslinie je Kriterium. Das Team sitzt im Abnahme-Meeting; die Tickets sammelst du selbst ein.',
  'moment.closeout.consequences':
    'Jeder Test läuft fünfzehn Sekunden; was seine Linie in dieser Zeit liefert, ist pink markiert. Sammelst du genug davon von Hand ein, wird das Kriterium am Ende der Zeit unterschrieben: eine Auszeichnung und mehr Überstunden auf jedes Ticket. Reicht es nicht, geht die Linie ans Ende der Schlange zu einem Nachtest von zehn Sekunden, ihre Treffer bleiben. Jeder gekaufte Knoten einer Linie senkt ihr Ziel; ihr Verdoppler oder Retainer zählt jeden Treffer anderthalbfach. Offene Hotfixes, Eskalationen, Quartalsenden, Pizza-Gutscheine und P0s verfallen, und im Endspurt kommen keine neuen.',
  'moment.closeout.approved':
    'Meridian Procurement Agent (automatisiert), im Auftrag des Programmausschusses, Quorum nicht erforderlich.',
  'moment.closeout.comments': 'LGTM.',
  'postmortem.stamp': 'ABGENOMMEN',
  'postmortem.stamp.by': 'Meridian Financial Group · ungelesen unterschrieben',
  'postmortem.well.criteria.all':
    'Alle {{total}} Abnahmekriterien im ersten Durchgang geprüft. Die Revision fragt, wie.',
  'postmortem.well.criteria.retest':
    'Alle {{total}} Abnahmekriterien geprüft, nach einem Nachtest. Die Befunde wurden als erledigt geschlossen.',
  'award.a-findings.label': 'Zurückgeschickt',
  'award.a-findings.blurb':
    'Ein Kriterium hat sein Ziel verfehlt und ging zurück in die Schlange. Der Kunde nannte es Sorgfalt.',
  'award.a-over-budget.label': 'Über Budget',
  'award.a-over-budget.blurb':
    'Das Budget hat 20 Brd. € überschritten, bevor das letzte Kriterium unterschrieben war. Der Kunde hat eine passende Erhöhung genehmigt.',
  'board.buff.escalation.held':
    'ESKALATION AUF DEM BOARD · FÜR EIN QUARTALSENDE AUFHEBEN',
  'board.buff.combo':
    'HOTFIX AUF DEM BOARD · ERST IHN, DANN DIE ESKALATION, DANN DAS QUARTALSENDE',
  'board.buff.combo.live':
    'HOTFIX LÄUFT · JETZT DIE ESKALATION, DANN DAS QUARTALSENDE',
  'postmortem.well.criteria.retests':
    'Alle {{total}} Abnahmekriterien geprüft, nach {{findings}} Nachtests. Die Befunde wurden als erledigt geschlossen.',
  'award.c-findings-0.label': 'Nachtest: Code-Stil',
  'award.c-findings-1.label': 'Nachtest: Abwärtskompatibilität',
  'award.c-findings-2.label': 'Nachtest: Testsuite',
  'award.c-findings-3.label': 'Nachtest: Merge-Strategie',
  'award.c-findings-4.label': 'Nachtest: Dokumentation',
  'award.c-findings-5.label': 'Nachtest: Wissenstransfer',
  'award.c-findings-6.label': 'Nachtest: Abschaltung',
  'award.c-findings-7.label': 'Nachtest: Architektur',
  'award.c-findings-8.label': 'Nachtest: Performance',
  'award.c-findings-0.blurb': 'Der Linter steht jetzt im Backlog.',
  'award.c-findings-1.blurb':
    'Die Kompatibilität wird in einem künftigen Release wiederhergestellt.',
  'award.c-findings-2.blurb': 'Der flaky Test wurde als flaky markiert.',
  'award.c-findings-3.blurb': 'Der Konflikt wurde beiden Teams zugewiesen.',
  'award.c-findings-4.blurb':
    'Die Dokumentation ist für Phase zwei eingeplant.',
  'award.c-findings-5.blurb':
    'Er ist vor der Übergabe gegangen. Das Loom dauert immer noch vierzig Minuten.',
  'award.c-findings-6.blurb':
    'Der Zombie-Service hat sein eigenes Abschaltticket überlebt.',
  'award.c-findings-7.blurb': 'Die Zielarchitektur wurde neu baselined.',
  'award.c-findings-8.blurb':
    'Die Performance wird gemessen, sobald sich die Agenten auf eine Metrik einigen.',
  'skill.contractRockstar.1.label': 'Helden-Einsatz',
  'skill.contractRockstar.blurb':
    'Der Rockstar unterschreibt das ganze Programm auf einmal. Keine Stufen, keine Verhandlung.',
  'skill.retainerRockstar.1.label': 'Helden-Bereitschaft',
  'skill.retainerRockstar.blurb':
    'Eine Monatspauschale für Heldentaten: Force Pushes kommen öfter und bringen ein Vielfaches.',
  'skill.contractZombie.1.label': 'Untoten-SLA',
  'skill.contractZombie.blurb':
    'Der untote Dienst bekommt ein SLA, das niemand halten kann, und rechnet das Verfehlen ab.',
  'skill.retainerZombie.1.label': 'Nachtschicht-Pauschale',
  'skill.retainerZombie.blurb':
    'Nachtschichten als Pauschale: mehr 3-Uhr-Alarme, jeder zum Nachttarif abgerechnet.',
  'skill.contractRewrite.1.label': 'Rewrite-Programm',
  'skill.contractRewrite.blurb':
    'Der Rewrite wird als ein Programm verkauft, mit allen Phasen und Schäden.',
  'skill.retainerRewrite.1.label': 'Parallel-Pauschale',
  'skill.retainerRewrite.blurb':
    'Alt und Neu laufen parallel, und beide stehen auf der Rechnung.',
  'skill.contractSwarm.1.label': 'Agenten-Flottenlizenz',
  'skill.contractSwarm.blurb':
    'Eine Flottenlizenz: jeder autonome PR wird geschätzt, bevor ihn jemand liest.',
  'skill.retainerSwarm.1.label': 'Human-Review-Pauschale',
  'skill.retainerSwarm.blurb':
    'Ein Mensch prüft jeden autonomen PR, nach Stunden abgerechnet.',
};
