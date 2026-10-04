import { EN_TICKET_TITLES } from './ticket-titles.en';
import { ticketTitleEntries } from './ticket-titles';

export const EN: Readonly<Record<string, string>> = {
  ...ticketTitleEntries(EN_TICKET_TITLES),
  'skill.effect.debtInterest': '{{pct}} chance a spawn arrives a rung up',
  'skill.effect.clickRadius': '{{pct}} mouse radius',
  'skill.effect.escalation': '{{pct}} Escalation payout',
  'skill.effect.escalationHold': 'Escalations last {{seconds}}s longer',
  'skill.effect.global': '{{pct}} on everything billed',
  'skill.effect.nearestClaim': 'Claims the nearest ticket, not just any one',
  'skill.effect.juniorBand': 'Juniors reach {{count}} rung higher',
  'skill.effect.none': 'Opens the programme',
  'skill.effect.signoff': 'Starts the acceptance push',
  'skill.effect.inert': 'No effect. None at all.',
  'skill.effect.topOfBand': 'Seniors take the biggest ticket first',
  'strip.shipping': 'EVERY CLOSE SHIPS',
  'strip.collecting': 'COLLECTING',
  'strip.releasing': 'RELEASING',
  'board.hazard.fact.due': '{{name}} IN {{seconds}}s',
  'board.hazard.fact.on': '{{name}} · {{seconds}}s',
  'board.hazard.invitation.due':
    '{{name}} IN {{seconds}}s · SWEEP THE INVITATION TO DECLINE',
  'board.hazard.invitation.on':
    '{{name}} · EVERYBODY ATTENDS, NOBODY WORKS · {{seconds}}s',
  'board.declined': 'DECLINED',
  'board.declined.caption': '{{meeting}} declined · the crew keep working',
  'board.release.title': 'RELEASE TRAIN',
  'board.release.hint':
    'The sprint is shipping. Nothing is picked up until the train is back.',
  'release.phase.freeze': 'Code Freeze',
  'release.phase.freeze.short': 'Freeze',
  'release.phase.ship': 'Ship to Production',
  'release.phase.ship.short': 'Ship',
  'release.phase.smoke': 'Smoke Test',
  'release.phase.smoke.short': 'Smoke',
  'release.phase.review': 'Sprint Review',
  'release.phase.review.short': 'Review',
  'release.phase.retro': 'Retro',
  'release.phase.retro.short': 'Retro',
  'release.phase.refinement': 'Refinement',
  'release.phase.refinement.short': 'Refine',
  'board.buff.quarter':
    'QUARTER END ON THE BOARD · HOLD IT FOR HOTFIX + ESCALATION',
  'board.buff.escalation': 'ESCALATION ×{{mult}} · {{seconds}}s',
  'board.buff.storm':
    'PERFECT STORM READY · SWEEP THE QUARTER END · ×{{mult}} · {{seconds}}s',
  'board.buff.hotfix': 'HOTFIX WINDOW ×{{mult}} · {{seconds}}s',
  'skill.effect.slots': 'Sprint scope +{{count}} per team',
  'skill.effect.cutCeremony': 'Cuts the {{phase}} from every release train',
  'skill.effect.spawnRate': '{{pct}} ticket spawn rate',
  'skill.effect.spawnRate.ticket': '{{pct}} {{ticket}} spawn rate',
  'skill.effect.standupAura': '{{each}} junior speed per junior, to {{cap}}',
  'skill.effect.ticketValue': '{{pct}} {{ticket}} value',
  'skill.effect.autoClose': 'Unclaimed {{ticket}} closes itself',
  'skill.lock.blocked': 'Blocked by {{by}}',
  'skill.lock.underfunded': 'Underfunded',
  'skill.lock.unknown': 'Unknown',
  'skill.status.maxed': 'Maxed',
  'skill.status.ready': 'Ready',
  'crew.takes.nothing': 'Closes nothing — oversees',
  'crew.takes.upTo': 'Takes up to {{ticket}}',
  'hazard.all-hands.label': 'All-Hands',
  'hazard.compliance.label': 'Compliance Training',
  'hazard.freeze.label': 'Prod Freeze',
  'hazard.grooming.label': 'Backlog Grooming',
  'hazard.migration.label': 'Migration Window',
  'hazard.page.label': 'Pager Duty',
  'hazard.reorg.label': 'Reorganisation Briefing',
  'hazard.retro.label': 'Sprint Retrospective',
  'hazard.storm.label': 'Incident Surge',
  'ticket.type.bug': 'Bug Report',
  'ticket.type.conflict': 'Merge Conflict',
  'ticket.type.escalation': 'Enterprise Escalation',
  'ticket.type.flaky': 'Flaky Test',
  'ticket.type.hotfix': 'Hotfix Window',
  'ticket.type.incident': 'P0 Incident',
  'ticket.type.invite': 'Calendar Invitation',
  'ticket.type.legacy': 'Legacy Defect',
  'ticket.type.lint': 'Lint Warning',
  'ticket.type.quarter': 'Quarter End',
  'ticket.type.rewrite': 'Migration Fallout',
  'ticket.type.rockstar': 'Force Push',
  'ticket.type.slop': 'Hallucinated Import',
  'ticket.type.swarm': 'Autonomous PR',
  'ticket.type.zombie': '3AM Page',
  'purchase.velocity.label': 'Story Point Estimation',
  'purchase.kit.label': 'Desk Fitout',
  'purchase.senior.label': 'Senior Dev',
  'purchase.junior.effect': 'one close every {{seconds}}s, plus the walk',
  'purchase.kit.effect': 'opens the Desk Fitout row on the Crew tab',
  'purchase.kit.next': '{{item}}: {{effect}}',
  'purchase.kit.done': 'every desk fitted out',
  'purchase.junior.label': 'Junior Dev',
  'hire.line': 'Senior Developer',
  'trait.closer.blurb':
    'Head down, headphones on. Gets through the patch faster.',
  'trait.closer.label': 'Closes fast',
  'trait.firefighter.blurb':
    'Goes to the worst of it before anything else. Enjoys it, which is the worrying part.',
  'trait.firefighter.label': 'Takes the biggest first',
  'trait.runner.blurb':
    'Never at their desk. Crosses the floor before you ask.',
  'trait.runner.label': 'Quick across the floor',
  'trait.scout.blurb':
    'Picks up what is in front of them instead of what looks interesting.',
  'trait.scout.label': 'Takes the nearest',
  'trait.sweeper.blurb':
    'While the file is open, everything near it is in scope too.',
  'trait.sweeper.label': 'Clears a wider patch',
  'purchase.velocity.effect':
    'every ticket closed also pays {{sp}} Story Point',
  'purchase.manager.effect': 'crew closes within reach bill ×{{aura}}',
  'purchase.manager.label': 'Account Manager',
  'purchase.senior.effect':
    'clears the whole patch every {{seconds}}s, from the merge conflicts up; P0s stay yours',
  'skill.effect.managerAura': '{{pct}} on crew closes a manager oversees',
  'kit.ci-tier.blurb':
    'Billed per minute of build. The flaky suite reruns until it passes.',
  'kit.ci-tier.label': 'CI Tier: Enterprise',
  'kit.ide-licence.blurb':
    'Per seat, per year. It can read the old framework, which nobody else can.',
  'kit.ide-licence.label': 'IDE Licences',
  'kit.keyboard.blurb':
    'Mechanical, and audible from the next floor. Bugs are found louder.',
  'kit.keyboard.label': 'Mechanical Keyboards',
  'kit.monitor.blurb':
    'A second screen, so the lint warnings can be read without scrolling.',
  'kit.monitor.label': 'Second Monitors',
  'kit.observability.blurb':
    'You finally see it coming. The escalation runs longer before anyone steps in.',
  'kit.observability.label': 'Observability Vendor',
  'kit.standing-desk.blurb':
    'Nobody raises them. The invoice does not know that.',
  'kit.standing-desk.label': 'Standing Desks',
  'language.de': 'Deutsch',
  'language.en': 'English',
  'settings.agent.label': 'Synergy Analyser (AI Powered)',
  'settings.agent.blurb':
    'A paperclip that has read the spreadsheet tells you what to buy next.',
  'agent.goal.bill':
    "It looks like you're trying to bill a client. Would you like help?",
  'agent.goal.adr':
    "It looks like you're trying to approve an ADR. Would you like help?",
  'agent.goal.signoff':
    "It looks like you're trying to get signed off. Would you like help?",
  'agent.goal.finish':
    "It looks like you're about to sign off with lines the client will test twice. Would you like help?",
  'agent.name': 'Synergy Analyser (AI Powered)',
  'agent.buy.title': 'Buy {{name}}',
  'agent.buy.detail': '{{cost}}. The most growth for what it costs, right now.',
  'agent.buy.spare':
    '{{cost}}. Nothing else pays back, and Story Points buy nothing else.',
  'agent.buy.opens':
    '{{cost}}. It opens {{then}}, which is where the growth is.',
  'agent.buy.finish':
    '{{cost}}. Finish this line before you sign: the client tests every line, and an unfinished one comes back.',
  'agent.save.idle': '{{short}} to go, and nothing earns it yet.',
  'agent.save.title': 'Save for {{name}}',
  'agent.save.detail':
    '{{short}} to go, about {{time}}. Buying anything else first is slower.',
  'agent.credit': '{{adr}}, on credit',
  'agent.income': '{{ticket}} rate',
  'agent.auto.label': 'Auto-buy',
  'agent.auto.blurb': 'Buys every suggestion the moment it is affordable.',
  'agent.warn.body':
    "It looks like you're trying to stop thinking. I tell you what to buy next, and my auto-buy buys it the moment you can afford it. That is cheating, and it takes all the fun out of the game.",
  'agent.tutorial.hello':
    "Hi! It looks like you're running a software consultancy. You bill by the ticket, and bad code makes tickets. Shall I show you around? Nothing moves while I talk.",
  'agent.tutorial.hello.next': 'Show me',
  'agent.tutorial.ticket':
    'Your developer throws work onto the board as tickets. The crew picks them up, and so can you. Let me throw you one.',
  'agent.tutorial.ticket.next': 'Throw a ticket',
  'agent.tutorial.collect':
    'There it is. Sweep your pointer over the ticket to pick it up. Hovering is enough, but clicking works too.',
  'agent.tutorial.goal':
    'Spend euros in the shop on the right: more developers, more lines of debt. Story Point Estimation earns Story Points, and Story Points buy the skill tree, where ADRs open dearer debt. I will be down here with advice. Click me any time.',
  'agent.tutorial.goal.next': 'Start billing',
  'agent.tutorial.paid':
    'Billed! Every ticket you or the crew picks up pays at once. Let me throw you another.',
  'agent.tutorial.paid.next': 'Throw another',
  'agent.tutorial.again': 'Pick that one up too.',
  'agent.tutorial.hire':
    'That makes €2, enough for a second developer. Buy Junior Intake in the shop on the right: every developer throws tickets onto the board for you to bill.',
  'agent.tutorial.sprint':
    'Every ticket picked up fills the sprint, the bar at the bottom of the board. A full sprint leaves on the release train, and nothing can be picked up until the train is back. Let me send this one early.',
  'agent.tutorial.sprint.next': 'Send the train',
  'agent.tutorial.back':
    'Back again. The train leaves the moment the sprint is full and keeps the board waiting while it is away, so a bigger sprint wastes fewer trips.',
  'agent.tutorial.back.next': 'And then?',
  'agent.tutorial.skip': 'Skip the tour',
  'agent.warn.ok': 'Understood',
  'agent.push.quip.0':
    "It looks like you're being tested. Would you like me to schedule a meeting about it?",
  'agent.push.quip.1':
    "Tip: pink is the client's favourite colour. Do not ask why.",
  'agent.push.quip.2':
    'I have generated a 40-page acceptance strategy. It says: pick up the pink ones.',
  'agent.push.quip.3':
    'Fun fact: every ticket you pick up here has already been billed twice.',
  'agent.push.quip.4':
    'The client says the build is fine. The client has not opened the build.',
  'agent.push.quip.5': 'I would help, but my licence expired at sign-off.',
  'agent.push.quip.6':
    'Remember: it is not technical debt if the client signs for it.',
  'agent.push.quip.7':
    'Synergy check: your mouse is the only one still working. Great culture fit.',
  'agent.push.quip.8':
    'I told procurement you are “nearly done”. Please be nearly done.',
  'agent.push.quip.9':
    "Accessibility note: the pink cards are pink. You're welcome.",
  'agent.push.retest.0':
    'It looks like that criterion came back. I have reframed it as a learning.',
  'agent.push.retest.1':
    'Re-tests are billable. I have already sent the invoice.',
  'agent.push.retest.2':
    'This line again? Think of it as a sequel nobody asked for.',
  'settings.close': 'Back to work',
  'settings.fullscreen.blurb':
    'Fills the screen. The board takes the extra room.',
  'settings.fullscreen.label': 'Fullscreen',
  'settings.help.blurb': 'Every card on the board, and how the run works.',
  'settings.help.label': 'Field guide',
  'settings.heading': 'Settings',
  'settings.language.blurb': 'Switching reloads the game. Your run is saved.',
  'settings.language.label': 'Language',
  'settings.music.blurb': 'Chiptune, on a loop.',
  'settings.music.label': 'Music',
  'settings.music.volume': 'Music volume',
  'settings.off': 'Off',
  'settings.on': 'On',
  'settings.ring.blurb': 'Draws how far your hand reaches, around the pointer.',
  'settings.ring.label': 'Show mouse radius',
  'settings.sfx.blurb': 'Every effect is synthesised. There are no files.',
  'settings.sfx.label': 'Sound effects',
  'settings.sfx.volume': 'Sound effects volume',
  'settings.subheading': 'How the game behaves. None of it is progress.',
  'title.fullscreen': 'Fullscreen',
  'title.pitch.fullscreen': 'Go fullscreen!',
  'title.name': 'Debt Growth',
  'title.photosensitivity':
    'Photosensitivity warning: this game has rapid flashes, flickering colours and fast-moving lights.',
  'title.premise':
    'You are supposed to be shipping clean, maintainable code. You are paid to close tickets, and tickets are produced by bad code.',
  'title.resume': 'Back to the engagement',
  'title.sound.off': 'Sound is off',
  'title.sound.on': 'Sound is on',
  'title.start': 'Open the engagement',
  'title.strap': 'A software consultancy, paid by the hour.',
  'title.windowed': 'Windowed',
  'award.achievement': 'Achievement',
  'award.dismiss': 'Dismiss',
  'award.reward.euro': '+{{amount}}',
  'award.reward.sp': '+{{amount}} SP',
  'award.milestone': 'Milestone',
  'award.criterion': 'Acceptance',
  'award.waiting': '+{{count}} more',
  'hud.budget': 'Budget',
  'hud.goal.adr': '{{pct}} % to ADR-{{adr}}',
  'hud.goal.signoff.credit': '{{pct}} % to sign-off · signable on credit',
  'hud.goal.signoff': '{{pct}} % to sign-off',
  'hud.points': 'Story Points',
  'hud.points.exact': '{{points}} Story Points',
  'hud.rate': '{{rate}}/s',
  'hud.epic': 'Epic: {{name}}',
  'hud.round': 'Round',
  'hud.round.open': 'open',
  'hud.round.acceptance': 'continuous',
  'hud.sprint.uncapped': 'uncapped',
  'hud.round.release': 'release {{seconds}}s',
  'hud.settings': 'Settings',
  'hud.sprint': 'Sprint',
  'hud.sprint.full': 'full · release train out',
  'hud.tree.back': 'Back to the floor',
  'hud.tree.buyable': 'something to buy',
  'hud.tree.open': 'Open the tree',
  'finale.curtain.action': 'Action item: play again. Owner: you.',
  'finale.curtain.again': 'New engagement',
  'finale.curtain.artists':
    'And thank you to every artist in the roll. The crew only exists because you drew them and gave them away.',
  'finale.curtain.back': 'Back to the post-mortem',
  'finale.curtain.body':
    'You spent a whole engagement making a codebase worse on purpose, and you were very, very good at it.',
  'finale.curtain.stats':
    '{{billed}} billed · {{closed}} tickets closed · {{sprints}} sprints',
  'finale.curtain.title': 'Thank you for playing.',
  'finale.roll.adrs': 'And introducing, in order of approval',
  'finale.roll.adrs.note': 'All eight are still in production.',
  'finale.roll.approved': 'Approved in writing for {{client}} by',
  'finale.roll.aside.backlog': 'The backlog is still not empty.',
  'finale.roll.aside.harm':
    'No tickets were harmed in the making of this game. Several were closed as won’t fix.',
  'finale.roll.aside.resemblance':
    'Any resemblance to a real engagement is the whole point.',
  'finale.roll.built': 'Built on',
  'finale.roll.inspired': 'Inspired by',
  'finale.roll.inspired.thanks':
    'A consultancy is only a garbage company that bills by the hour. Go play the original.',
  'finale.roll.crew': 'The crew',
  'finale.roll.drawn': 'The crew were drawn by',
  'finale.roll.drawn.thanks':
    'They drew these people for free, so that strangers could make things like this. Thank you.',
  'finale.roll.drawn.unnamed':
    'and the artists whose names a sheet did not keep',
  'finale.roll.drawn.via':
    'for the Liberated Pixel Cup, assembled with the Universal LPC Spritesheet Character Generator.',
  'finale.roll.juniors': 'Juniors',
  'finale.roll.label': 'Closing credits',
  'finale.roll.made': 'Written, designed and billed by',
  'finale.roll.managers': 'Managers',
  'finale.roll.seniors': 'Seniors',
  'finale.skip': 'Skip to the end',
  'finale.stage.cake': 'too much cake',
  'story.label': 'The story of the engagement',
  'story.next': 'Next',
  'story.skip': 'Skip to the credits',
  'story.1':
    'It began, as these things do, with a framework nobody was allowed to upgrade. The consultancy looked at it, looked at the rate card, and decided it was perfect.',
  'story.2':
    'Soon the team found that the fastest way to write a service was to copy the last one. And the one before that. The wiki called it a pattern. The invoices called it growth.',
  'story.3':
    'When the backlog outgrew the building, the work went round the planet. The office never slept again. It simply stopped being in any one time zone.',
  'story.4':
    'Then came the tool that wrote the code itself. It was fluent, confident and wrong, which, the partners noted, was also the job description.',
  'story.5':
    'One engineer closed more tickets than everyone else combined, so they were given the keys to main. Nobody asked for them back until they had already left.',
  'story.6':
    'After the rockstar went, the team found services that nobody owned. They were left running. At three in the morning, they still call.',
  'story.7':
    'The only way out was to start again. So a second system rose beside the first, and the consultancy billed for both, and for every argument between them.',
  'story.8':
    'At last the work began to do itself. Agents wrote the pull requests, agents approved them, and a human was kept in the diagram, for reassurance.',
  'story.outside':
    '{{client}} signed without reading. {{closed}} tickets were closed and {{billed}} was billed, and the backlog is exactly as long as it ever was. From the outside, the tower looks fine.',
  'postmortem.finale': 'Close the engagement',
  'postmortem.no-tier': 'None approved',
  'skill.golden.1.label': 'Partner-Only Work',
  'skill.signoff.blurb':
    "The closeout starts the acceptance push: the crew goes into the acceptance meeting and the client tests one line of work at a time. Sweep up that line's pink tickets before the timer runs out. A line that misses its goal comes back for a re-test at the end, its pickups kept; every criterion signed raises the overtime. Buy into a line before signing: its nodes lower its goal, its double or retainer counts each pickup one and a half times.",
  'skill.signoff.1.label': 'Sign the Closeout',
  'skill.golden.blurb':
    'Some work arrives flagged partner-only. It pays a fortune, and the crew will not go near it.',
  'skill.goldenCrew.1.label': 'Delegated Authority',
  'skill.goldenCrew.blurb':
    'Clear the crew to touch partner-only work. You stop being the bottleneck.',
  'skill.goldenValue.1.label': 'Partner Rate',
  'skill.goldenValue3.1.label': 'Partner Rate II',
  'skill.goldenValue5.1.label': 'Partner Rate III',
  'skill.goldenValue7.1.label': 'Partner Rate IV',
  'skill.goldenValue.blurb':
    'Bill the partner-only work the way a partner bills.',
  'skill.effect.goldenChance': 'Golden work: {{value}} of arrivals',
  'skill.effect.goldenCrew':
    'The crew handle golden work, and {{value}} of what they close turns golden',
  'skill.effect.goldenValue': 'Golden work pays +{{times}}×',
  'spawner.0.blurb':
    'Fresh graduates, shipping formatting crimes and off-by-ones. The intake never stops.',
  'spawner.0.label': 'Junior Intake',
  'tier.1.blurb':
    'jQuery 1.4, load-bearing. Small defects, constantly, forever.',
  'tier.1.name': 'Legacy Framework',
  'tier.2.blurb':
    'Devs cycle past duplicating code, dropping flaky tests behind them.',
  'tier.2.name': 'Copy-Paste Culture',
  'tier.3.blurb': 'Merge conflicts, at volume, around the clock.',
  'tier.3.name': 'Offshore Contractors',
  'tier.4.blurb':
    'Plausible-looking code that is subtly wrong. Reads fine once.',
  'tier.4.name': 'AI Slop',
  'tier.5.blurb': 'Force-pushes to main. Declines the retro.',
  'tier.5.name': 'The Rockstar Dev',
  'tier.6.blurb': 'Unowned, unkillable, still pages at 3am.',
  'tier.6.name': 'Zombie Service',
  'tier.7.blurb': 'A migration rolls through and flattens the city.',
  'tier.7.name': 'The Big Rewrite',
  'tier.8.blurb': 'Autonomous agents. Infinite pull requests.',
  'tier.8.name': 'Agent Swarm',
  'skill.assurance.1.label': 'Human in the Loop',
  'skill.assurance.2.label': 'Assurance Review',
  'skill.assurance.3.label': 'Sign-Off Committee',
  'skill.assurance.blurb':
    'Everything bills better, and a committee signs it off.',
  'skill.capacity.1.label': 'Bigger Sprints',
  'skill.capacity.2.label': 'Bigger Again',
  'skill.capacity1.1.label': 'Stretch Goal',
  'skill.capacity2.1.label': 'Stretch Goals',
  'skill.capacity3.1.label': 'Aggressive Commitment',
  'skill.capacity4.1.label': 'Overcommitted',
  'skill.capacity5.1.label': 'Sprint Vibes',
  'skill.capacity6.1.label': 'Capacity Under Review',
  'skill.capacity7.1.label': 'Sprint Goal Deprecated',
  'skill.capacity8.1.label': 'What Sprint Goal',
  'skill.capacity.blurb':
    'A sprint exists to be small. Grow it anyway: every team holds more before the train has to leave.',
  'skill.client.1.label': 'The Client',
  'skill.crew.1.label': 'Juniors',
  'skill.legacyLine.1.label': 'Legacy Framework',
  'skill.flakyLine.1.label': 'Copy-Paste Culture',
  'skill.conflictLine.1.label': 'Offshore Contractors',
  'skill.slopLine.1.label': 'AI Slop',
  'skill.rockstarLine.1.label': 'The Rockstar Dev',
  'skill.zombieLine.1.label': 'Zombie Service',
  'skill.rewriteLine.1.label': 'The Big Rewrite',
  'skill.swarmLine.1.label': 'Agent Swarm',
  'skill.poker.1.label': 'Planning Poker',
  'skill.partner.1.label': 'Partner Work',
  'skill.seniors.1.label': 'Seniors',
  'skill.managers.1.label': 'Account Managers',
  'skill.morale.1.label': 'Team Morale',
  'skill.incidents.1.label': 'Incidents',
  'skill.debt.1.label': 'The Debt',
  'skill.debtInterest.1.label': 'Technical Debt Interest',
  'skill.debtInterest6.1.label': 'Compound Interest',
  'skill.debtInterest7.1.label': 'Interest on Interest',
  'skill.debtInterest.blurb':
    'A chance a ticket arrives one rung further up than it should.',
  'skill.cutRetro.1.label': 'Retro Moved to Slack',
  'skill.cutRefinement.1.label': 'Refined During Standup',
  'skill.cutReview.1.label': 'Reviewed by Thumbs-Up',
  'skill.cutSmoke.1.label': 'Smoke-Tested in Prod',
  'skill.cutFreeze.1.label': 'Friday Deploys',
  'skill.cutRetro.blurb':
    'The retro happens in a Slack thread nobody opens. The release train skips it.',
  'skill.cutRefinement.blurb':
    'Tickets are refined in the standup, by whoever talks first. The release train skips refinement.',
  'skill.cutReview.blurb':
    'The sprint review is a thumbs-up emoji. The release train skips it.',
  'skill.cutSmoke.blurb':
    'Production is the smoke test. The release train skips the one before it.',
  'skill.cutFreeze.blurb':
    'No code freeze, not even on Fridays. The train keeps only the shipping, and nobody cuts that.',
  'skill.escalation.1.label': 'Emergency Rates',
  'skill.escalation1.1.label': 'Bus Factor',
  'skill.escalation2.1.label': 'Dual Running',
  'skill.escalation.blurb':
    'An Enterprise Escalation multiplies the whole sprint harder.',
  'skill.hand.1.label': 'The Hand',
  'skill.junior.1.label': 'Junior Dev',
  'skill.junior.blurb':
    'One more junior on the floor. They walk, they claim, they close.',
  'skill.juniorPresence.1.label': 'Standup Aura',
  'skill.juniorPresence2.1.label': 'Bootcamp Pipeline',
  'skill.juniorPresence.blurb':
    'Juniors work better in a crowd, and take the neighbour too.',
  'skill.juniorReach.1.label': 'Hot Desking',
  'skill.juniorReach2.1.label': 'Open Plan Office',
  'skill.juniorReach3.1.label': 'Neighbouring Files',
  'skill.juniorReach.blurb': 'Juniors reach further, and higher up the ladder.',
  'skill.juniorSpeed.1.label': 'Onboarding',
  'skill.juniorSpeed2.1.label': 'Pair Programming',
  'skill.juniorSpeed3.1.label': 'Crunch Time',
  'skill.juniorSpeed.blurb': 'Juniors close faster and walk faster.',
  'skill.kit.1.label': 'Desk Fitout',
  'skill.kit.blurb': 'The desks fitted out. Every item is on the value side.',
  'skill.lineOfSight.1.label': 'Line of Sight',
  'skill.lineOfSight.blurb':
    'The crew claims the nearest ticket instead of any ticket.',
  'skill.manager.1.label': 'Account Manager',
  'skill.manager.blurb':
    'One more Account Manager. They close nothing and bill the most.',
  'skill.managerSpeed.1.label': 'Account Management',
  'skill.managerSpeed5.1.label': 'Client Golf',
  'skill.managerSpeed6.1.label': 'Executive Sponsor',
  'skill.managerSpeed.blurb': 'Managers oversee a wider desk and walk faster.',
  'skill.o2.1.label': 'Meeting Room',
  'skill.o2.blurb': 'A room to decide in. The sprint takes a little more.',
  'skill.o3.1.label': 'Break Room',
  'skill.o3.blurb': 'Somewhere to go. Juniors walk faster for having left.',
  'skill.o5.1.label': 'War Room',
  'skill.o5.blurb': 'Nobody leaves. Seniors sweep wider.',
  'skill.o6.1.label': 'Records Store',
  'skill.o6.blurb': 'Everything is written down. Everything bills better.',
  'skill.o7.1.label': 'Corner Office',
  'skill.o7.blurb': 'A door that closes. Escalations are worth more.',
  'skill.office.1.label': 'The Floor',
  'skill.facilities.1.label': 'Facility Management',
  'skill.facilities.blurb':
    'Rooms and kit. The ticket is raised; someone looks at it next quarter.',
  'skill.ceremonies.1.label': 'Meeting Detox',
  'skill.ceremonies.blurb':
    'One ceremony fewer per ADR. Nobody notices, least of all the client.',
  'skill.onboarding.1.label': 'Self-Service Onboarding',
  'skill.onboarding.blurb':
    'There is a wiki. It was last edited by someone who has since left.',
  'skill.handcuffs.1.label': 'Golden Handcuffs',
  'skill.handcuffs.blurb':
    'Seniors are kept with perks instead of pay. It mostly works.',
  'skill.radius.1.label': 'Mouse Radius',
  'skill.radius1.1.label': 'Muscle Memory',
  'skill.radius2.1.label': 'Backlog Grooming',
  'skill.radius.blurb': 'Triage everything within a radius of the pointer.',
  'skill.relabel.1.label': 'Sign-Off Authority',
  'skill.relabel5.1.label': 'Change Requests',
  'skill.relabel6.1.label': 'Rate Card Review',
  'skill.relabel.blurb': 'What the crew closes under a manager bills more.',
  'skill.root.1.label': 'Backlog Triage',
  'skill.root.blurb': 'Open the backlog. Everything else hangs off this.',
  'skill.secret.1.label': 'You read the code',
  'skill.secret.blurb':
    'You went looking. Everything bills better, and nobody signed off on it.',
  'skill.senior.1.label': 'Senior Dev',
  'skill.senior.blurb': 'One more senior. Dearer, faster, and they sweep.',
  'skill.seniorPresence.1.label': 'Batch Review',
  'skill.seniorPresence4.1.label': 'Architecture Review',
  'skill.seniorPresence5.1.label': 'Top of Band',
  'skill.seniorPresence.blurb':
    'Seniors take more at once, and take the best of it.',
  'skill.seniorReach.1.label': 'Sweep Radius',
  'skill.seniorReach4.1.label': 'Fire Drill',
  'skill.seniorReach5.1.label': 'Blast Radius',
  'skill.seniorReach.blurb': 'Seniors sweep a wider radius when they close.',
  'skill.seniorSpeed.1.label': 'Senior Onboarding',
  'skill.seniorSpeed4.1.label': 'Escalation Ownership',
  'skill.seniorSpeed5.1.label': 'Corridor Instinct',
  'skill.seniorSpeed.blurb': 'Seniors close faster and walk faster.',
  'skill.spawnConflict.1.label': 'Long-Lived Branches',
  'skill.spawnFlaky.1.label': 'Copy-Paste Registry',
  'skill.spawnIncident.1.label': 'Incident Culture',
  'skill.spawnIncident7.1.label': 'Escalation Chance',
  'skill.spawnIncident8.1.label': 'Incident Payout',
  'skill.spawnIncident7.blurb': 'More escalations arrive.',
  'skill.spawnIncident8.blurb': 'Incidents bill double.',
  'skill.spawnIncident.blurb': 'More incidents arrive.',
  'skill.spawnLegacy.1.label': 'Framework Churn',
  'skill.spawnLint.1.label': 'Skip the Review',
  'skill.stretch.1.label': 'Stretch Assignment',
  'skill.stretch.blurb': 'Juniors reach one rung higher than their band.',
  'skill.ticketStacking.1.label': 'Ticket Stacking',
  'skill.ticketStacking.blurb':
    'Juniors take the neighbouring ticket too, and close slower for it.',
  'skill.triagePolicy.1.label': 'Triage Policy',
  'skill.triagePolicy2.1.label': 'Scope Freeze',
  'skill.triagePolicy.blurb':
    'No crew claims the type any more. A card left on the board closes itself instead of going stale, and ships. With the train away it has nowhere to go but prod.',
  'skill.valueBug.1.label': 'Bug Bounty',
  'skill.valueBug.blurb': 'Bugs bill double.',
  'skill.valueConflict.1.label': 'Conflict Boost',
  'skill.valueConflict.blurb': 'Merge conflicts bill double.',
  'skill.valueFlaky.1.label': 'Flake Retainer',
  'skill.valueFlaky.blurb': 'Flaky tests bill double.',
  'skill.valueLegacy.1.label': 'Defect Premium',
  'skill.valueLegacy.blurb': 'Legacy tickets bill double.',
  'skill.valueLint.1.label': 'Double Lint',
  'skill.valueLint.blurb': 'Lint warnings bill double.',
  'skill.spawnSlop.1.label': 'Vibe Coding',
  'skill.valueSlop.1.label': 'Prompt Engineering',
  'skill.valueSlop.blurb': 'Slop bills more.',
  'skill.estimatesLegacy.1.label': 'Archaeology Surcharge',
  'skill.estimatesLegacy2.1.label': 'Nobody Knows Why',
  'skill.estimatesLegacy3.1.label': 'Rewrite Estimate',
  'skill.estimatesLegacy.blurb':
    'Nobody understands the old code, so every legacy defect is a big estimate.',
  'skill.estimatesFlaky.1.label': 'Rerun Estimate',
  'skill.estimatesFlaky3.1.label': 'Retry Budget',
  'skill.estimatesFlaky4.1.label': 'Skip Annotation',
  'skill.estimatesFlaky.blurb':
    'Every flaky test is re-estimated for the rerun.',
  'skill.estimatesConflict.1.label': 'Rebase Estimate',
  'skill.estimatesConflict4.1.label': 'Merge Window',
  'skill.estimatesConflict4.2.label': 'Branch Freeze',
  'skill.estimatesConflict.blurb':
    'Every merge conflict carries its own estimate.',
  'skill.estimatesSlop.1.label': 'Prompt Estimate',
  'skill.estimatesSlop.2.label': 'Context Window',
  'skill.estimatesSlop.3.label': 'Model Upgrade',
  'skill.estimatesSlop.blurb':
    'Every hallucinated import is estimated by the token.',
  'skill.effect.spPerClose': '+{{count}} SP per ticket',
  'skill.effect.acceptance.goal': 'acceptance: a lower goal for this line',
  'skill.effect.acceptance.finisher':
    'acceptance: every pickup of this line counts one and a half times',
  'skill.effect.spPerClose.ticket': '+{{count}} SP per {{ticket}}',
  'skill.coaches.1.label': 'Agile Centre of Excellence',
  'skill.coaches6.1.label': 'The Agile Tribe',
  'skill.coaches.blurb':
    'A coach at the edge of the path runs planning poker. Work that falls through a live vote gets re-estimated upward.',
  'skill.effect.coach': '+{{count}} planning-poker vote',
  'skill.deck.1.label': 'Add a ☕',
  'skill.deck6.1.label': 'Estimate in Epics',
  'skill.deck.blurb':
    'A bigger card in every coach’s deck. Each vote a ticket falls through re-estimates it higher.',
  'skill.effect.deck': '+{{count}} SP per vote a ticket falls through',
  'skill.pizza.1.label': 'Pizza Party',
  'skill.pizza.blurb':
    'An engineering manager starts leaving pizza vouchers on the board. Sweep one and the crew nearby work much faster until the pizza is gone.',
  'skill.effect.pizza':
    'Pizza vouchers: ×{{times}} crew nearby for {{seconds}}s',
  'ticket.type.pizza': 'Pizza Party Voucher',
  'skill.timesheets.1.label': 'Timesheet Padding',
  'skill.timesheets.blurb':
    'Work the crew and the pipeline close gets logged twice.',
  'skill.effect.crewSp': 'Crew and pipeline closes pay double SP',
  'skill.effect.cans': '+{{count}} team on the sprint, bringing its own scope',
  'skill.effect.room': '+{{count}} seats',
  'skill.effect.adr':
    'Approves ADR-{{adr}}: opens its line and the work it leaves',
  'skill.adrs.1.label': 'Architecture Decisions',
  'skill.cans1.1.label': 'Platform Team',
  'skill.cans1.2.label': 'Growth Team',
  'skill.cans2.1.label': 'Tiger Team',
  'skill.cans3.1.label': 'Tiger Team 2',
  'skill.cans4.1.label': 'Tiger Team (New)',
  'skill.cans5.1.label': 'Enablement Squad',
  'skill.cans6.1.label': 'Task Force',
  'skill.cans7.1.label': 'Task Force (Final)',
  'skill.cans8.1.label': 'Task Force (Final) 2',
  'skill.cans.blurb':
    "Put another team on the sprint. It holds a whole team's scope more before the train has to leave.",
  'skill.juniorRoom2.1.label': 'Bullpen',
  'skill.juniorRoom3.1.label': 'Second Bullpen',
  'skill.juniorRoom4.1.label': 'Floor Expansion',
  'skill.juniorRoom.blurb': 'Five more junior seats. The rail hires into them.',
  'skill.seniorRoom3.1.label': 'Quiet Corner',
  'skill.seniorRoom4.1.label': 'Corner Offices',
  'skill.seniorRoom5.1.label': 'Senior Wing',
  'skill.seniorRoom.blurb':
    'Five more senior seats. Doors that close, for people who bill more.',
  'skill.managerRoom5.1.label': 'Client Lounge',
  'skill.managerRoom.blurb':
    'Five more account manager seats, and a sofa for the client.',
  'rail.affordable': 'affordable',
  'rail.eta': 'affordable in {{time}}',
  'rail.more.adr': '{{count}} more after that.',
  'rail.more.rate': '{{count}} more after that.',
  'rail.teaser.adr': 'Opens with ADR-{{adr}}.',
  'rail.tab.supply': 'Debt',
  'rail.tab.income': 'Rates',
  'rail.tab.crew': 'Crew',
  'rail.income.locked': 'A rate opens once its source is on the path.',
  'rail.income.effect': 'Bills {{pct}} more for every {{ticket}}',
  'skill.adr1.1.label': 'Approve ADR-1',
  'skill.adr1.blurb':
    'Adopts the legacy framework. Its maintainers walk the path and leave work behind.',
  'skill.adr2.1.label': 'Approve ADR-2',
  'skill.adr2.blurb':
    'Blesses copy-paste as a pattern. The flakes come with it.',
  'skill.adr3.1.label': 'Approve ADR-3',
  'skill.adr3.blurb':
    'Signs the offshore contract. Merge conflicts, around the clock.',
  'skill.adr4.1.label': 'Approve ADR-4',
  'skill.adr4.blurb':
    'Puts an AI assistant on the team. It writes more than anyone can read.',
  'skill.adr5.1.label': 'Approve ADR-5',
  'skill.adr5.blurb':
    'Gives the rockstar commit rights, and a line on the path.',
  'skill.adr6.1.label': 'Approve ADR-6',
  'skill.adr6.blurb':
    'Declares a service deprecated without deleting it. It still pages.',
  'skill.adr7.1.label': 'Approve ADR-7',
  'skill.adr7.blurb':
    'Hires the CTO who wants a rewrite. The migration starts on the path.',
  'skill.adr8.1.label': 'Approve ADR-8',
  'skill.adr8.blurb':
    'Stands up the architecture board. Agents, forever, in parallel.',
  'skill.doubleLint.1.label': 'Quadruple Lint',
  'skill.doubleLint.blurb':
    'Lint warnings bill double again. Opens once its three ladders are maxed.',
  'skill.spawnLint1.1.label': 'eslint-disable-next-line',
  'skill.spawnLint2.1.label': 'Prettier Is Optional',
  'skill.incomeLint.1.label': 'Style Guide Consulting',
  'skill.incomeLint1.1.label': 'Code Hygiene Workshop',
  'skill.incomeLint2.1.label': 'Whitespace Centre of Excellence',
  'skill.incomeLint.blurb':
    'Lint warnings bill more at every step; three steps bill ×3.5.',
  'skill.spawnLint.blurb':
    'More lint warnings at every step: a developer throws two. Three steps double the line.',
  'skill.doubleLegacy.1.label': 'Maintenance Contract',
  'skill.doubleLegacy.blurb':
    'Legacy defects bill double again. Opens once its three ladders are maxed.',
  'skill.spawnLegacy2.1.label': 'Fork the Framework',
  'skill.spawnLegacy3.1.label': 'jQuery Forever',
  'skill.incomeLegacy.1.label': 'Legacy Support Tier',
  'skill.incomeLegacy2.1.label': 'Extended Support Contract',
  'skill.incomeLegacy3.1.label': 'Museum Pricing',
  'skill.incomeLegacy.blurb':
    'Legacy defects bill more at every step; three steps bill ×3.5.',
  'skill.spawnLegacy.blurb':
    'More legacy defects at every step: a developer throws two. Three steps double the line.',
  'skill.doubleFlaky.1.label': 'Retry Surcharge',
  'skill.doubleFlaky.blurb':
    'Flaky tests bill double again. Opens once its three ladders are maxed.',
  'skill.spawnFlaky3.1.label': 'Retry Until Green',
  'skill.spawnFlaky4.1.label': 'Tests Are Optional',
  'skill.incomeFlaky.1.label': 'Rerun Fee',
  'skill.incomeFlaky3.1.label': 'Flake Triage Retainer',
  'skill.incomeFlaky4.1.label': 'Nondeterminism Premium',
  'skill.incomeFlaky.blurb':
    'Flaky tests bill more at every step; three steps bill ×3.5.',
  'skill.spawnFlaky.blurb':
    'More flaky tests at every step: a developer throws two. Three steps double the line.',
  'skill.doubleConflict.1.label': 'Rebase Surcharge',
  'skill.doubleConflict.blurb':
    'Merge conflicts bill double again. Opens once its three ladders are maxed.',
  'skill.spawnConflict4.1.label': 'Rebase Is Scary',
  'skill.spawnConflict4.2.label': 'Monorepo of Forks',
  'skill.incomeConflict.1.label': 'Merge Assistance',
  'skill.incomeConflict4.1.label': 'Integration Hourly Rate',
  'skill.incomeConflict4.2.label': 'Git Therapist',
  'skill.incomeConflict.blurb':
    'Merge conflicts bill more at every step; three steps bill ×3.5.',
  'skill.spawnConflict.blurb':
    'More merge conflicts at every step: a developer throws two. Three steps double the line.',
  'skill.doubleSlop.1.label': 'Token Surcharge',
  'skill.doubleSlop.blurb':
    'Hallucinated imports bill double again. Opens once its three ladders are maxed.',
  'skill.spawnSlop.2.label': 'Tab, Tab, Tab',
  'skill.spawnSlop.3.label': 'Prompt-Only Codebase',
  'skill.incomeSlop.1.label': 'AI Review Surcharge',
  'skill.incomeSlop.2.label': 'Prompt Rework Fee',
  'skill.incomeSlop.3.label': 'AI Transformation Programme',
  'skill.incomeSlop.blurb':
    'Hallucinated imports bill more at every step; three steps bill ×3.5.',
  'skill.spawnSlop.blurb':
    'More hallucinated imports at every step: a developer throws two. Three steps double the line.',
  'skill.estimatesLint.1.label': 'Generous Estimates',
  'skill.estimatesLint1.1.label': 'Buffer for Unknowns',
  'skill.estimatesLint2.1.label': 'Everything Is an XL',
  'skill.estimatesLint.blurb':
    'Estimate a little higher. Every lint warning closed carries more story points.',
  'skill.lock.needs-adr': 'Needs ADR-{{adr}}',
  'skill.lock.needs-maxed': 'Max {{by}} first',
  'skill.o4.1.label': 'Server Room',
  'skill.o4.blurb': 'It hums. That is all it does.',
  'skill.effect.pace.juniors.close': '{{pct}} junior close speed',
  'skill.effect.pace.juniors.walk': '{{pct}} junior walk speed',
  'skill.effect.pace.juniors.sweep': '{{pct}} junior reach',
  'skill.effect.pace.seniors.close': '{{pct}} senior close speed',
  'skill.effect.pace.seniors.walk': '{{pct}} senior walk speed',
  'skill.effect.pace.seniors.sweep': '{{pct}} sweep radius',
  'skill.effect.pace.managers.close': '{{pct}} account manager speed',
  'skill.effect.pace.managers.walk': '{{pct}} account manager walk speed',
  'skill.effect.pace.managers.sweep': '{{pct}} account manager reach',
  'skill.effect.batch.one': '+{{count}} ticket per sweep',
  'skill.effect.batch.many': '+{{count}} tickets per sweep',
  'skill.effect.batch.slower':
    '+{{count}} ticket per close, {{slower}} close time',
  'help.heading': 'Field Guide',
  'help.subheading':
    'How the engagement runs, and every ticket on the board. The game waits while you read.',
  'help.close': 'Back to work',
  'help.line.heading': 'Line work',
  'help.line.intro':
    'Thrown by the developers on each line. You or the crew can take it, and it bills the moment it is picked up. If nobody gets to it in {{seconds}}s, it is closed as won’t fix.',
  'help.special.heading': 'Special cards',
  'help.special.intro':
    'Only your mouse takes these. The crew leave them alone, and they never go stale.',
  'help.marks.heading': 'Marks on a card',
  'help.from.adr': 'from ADR-{{adr}}',
  'help.from.pizza': 'Pizza Party node',
  'help.ticket.lint':
    'The opening’s bread and butter: cheap and plentiful. The first type Triage Policy closes on its own.',
  'help.ticket.bug':
    'Rarer than lint and worth twice as much. Triage Policy’s second pick.',
  'help.ticket.legacy':
    'The first line an ADR opens. Every rung up the ladder bills ten times the last.',
  'help.ticket.flaky':
    'Close it and it fails again: the same card comes back {{seconds}}s later and bills a second time.',
  'help.ticket.conflict':
    'The first rung the seniors work. The juniors still take it too.',
  'help.ticket.slop': 'The highest rung the juniors reach on their own.',
  'help.ticket.rockstar':
    'Past the juniors’ band: the seniors take it, the juniors only once they reach higher.',
  'help.ticket.zombie':
    'Close it and it pages again: back {{seconds}}s later, billed a second time.',
  'help.ticket.rewrite': 'Senior work, worth ten force pushes.',
  'help.ticket.swarm': 'The top rung, and the dearest work on the board.',
  'help.ticket.incident':
    'Pays more with every ADR approved. Auto-closed work that finds the release train away lands here too, as a P0.',
  'help.ticket.escalation':
    'Sweep it and every close pays ×{{mult}} for {{seconds}}s. Take all you can while it runs.',
  'help.ticket.hotfix':
    'Sweep it and every ticket bills ×{{mult}} for {{seconds}}s.',
  'help.ticket.quarter':
    'Bills every card resting on the board at once. Worth most when the board is full.',
  'help.ticket.pizza':
    'Sweep it and the crew around it work ×{{mult}} as fast for {{seconds}}s.',
  'help.ticket.invite':
    'A meeting. Sweep it within {{seconds}}s to decline, or the crew leave the board for the meeting room.',
  'help.mark.golden.label': 'Golden',
  'help.mark.golden':
    'Any card can arrive golden: worth ×{{times}}, and it waits {{seconds}}s. The crew leave it to you until Delegated Authority.',
  'help.mark.voted.label': 'Re-estimated',
  'help.mark.voted':
    'The border means it fell through a planning-poker vote or a grooming session. It pays extra story points when picked up.',
  'title.help': 'How to play',
  'help.tab.game': 'How it works',
  'help.tab.tickets': 'Tickets',
  'help.tab.strategy': 'Strategy',
  'help.strategy.heading': 'Billing the most hours',
  'help.strategy.intro':
    'The client pays for hours, not outcomes. This is how the partners make the most of them.',
  'help.strategy.velocity':
    'Buy Story Point Estimation first. Until you do, no pickup pays story points, and the tree stays shut. It costs €{{price}}.',
  'help.strategy.adr':
    'The next ADR is always the goal. Each one opens a line worth ten times the last, so one ticket on the new line outbills a screen of the old. Pick up cheap buys on the way; skip whatever would hold the ADR back.',
  'help.strategy.rates':
    'Rate rows are for cheap work. They add a flat sum to every ticket: decisive on lint, nothing near the top. Buy them early, then put the euros into developers on the newest line.',
  'help.strategy.train':
    'Watch the release train. If the sprint fills faster than the train comes back, more developers buy nothing: the sprint is your limit. Buy scope and ceremony cuts until the train stops being the wait.',
  'help.strategy.golden':
    'Never leave a golden card. It is worth a hundred tickets or more, and the crew won’t touch it until Delegated Authority. It waits {{seconds}}s, so finish your sweep, then go and get it. It pays euros, not story points: it buys developers, not ADRs.',
  'help.strategy.hand':
    'Your hand is for what the crew won’t touch: P0s, hotfixes, escalations, quarter ends.',
  'help.strategy.storm':
    'The perfect storm runs in order: hotfix, then escalation, then a quarter end on a full board. A quarter end held for that moment bills the board many times over; don’t spend it on an empty one.',
  'help.strategy.meetings':
    'Decline meetings. Sweep an invitation the moment it lands, or the crew leave the board for the meeting room.',
  'help.strategy.prod':
    'Clear prod before the train leaves. From ADR-{{adr}}, every P0 still on the board adds an Incident Review to the release.',
  'help.strategy.credit':
    'Take credit when an ADR is close. From ADR-{{adr}} to ADR-{{last}} you can approve the next one holding {{share}} % of its price and repay the rest from later story points. Waiting for the last of it is time you don’t bill.',
  'help.train.heading': 'The release train',
  'help.train.intro':
    'There is no round timer. A round is one sprint’s release, so the pace is whatever your throughput makes it.',
  'help.train.1':
    'Every line ticket you or the crew pick up takes one slot of the sprint: {{slots}} slots right now.',
  'help.train.2':
    'When the last slot fills, the train leaves on its own. The work was billed at pickup; the release pays nothing extra.',
  'help.train.3':
    'While it is away, nobody picks up line work, not you and not the crew. Special cards still sweep. The lines keep throwing, and cards nobody reaches still close as won’t fix.',
  'help.train.4':
    'Once Triage Policy auto-closes a type, what it closes with the train away goes straight to prod as a P0 incident, {{cap}} live at most.',
  'help.train.5':
    'Every train is time you cannot bill. Bigger Sprints adds {{step}} slots a rank, each team you put on the sprint adds a whole team’s scope, and the ceremony nodes on the tree cut the release short. The shipping itself is never cut.',
  'help.train.release': 'The release right now: {{seconds}}s.',
  'help.loop.heading': 'The loop',
  'help.loop.1':
    'The developers on each line throw tickets onto the board. Sweep your pointer over one to pick it up: it bills the moment you do.',
  'help.loop.2':
    'Picked-up work fills the sprint. A full sprint ships on the release train and takes nothing until the train is back.',
  'help.loop.3':
    'Euros buy the shop on the right: more developers, better rates, and a crew who pick up work for you.',
  'help.loop.4':
    'Story points buy the skill tree. Approve ADRs there to open new lines of ever dearer debt. Drag to pan, wheel to zoom, hover a square to read it; a black box says only that something is there.',
  'help.loop.5':
    'Last on the tree, Sign the Closeout starts the acceptance push: nine tests of fifteen seconds. Sweep up the pink tickets of the line under test; a line that misses its goal is re-tested for ten seconds at the end, its pickups kept. A line’s own nodes lower its goal, and its double or retainer counts each pickup one and a half times. The engagement is done when all nine are signed.',
  'award.m-first-close.label': 'First ticket triaged',
  'award.m-first-close.blurb': 'Somebody had to.',
  'award.m-first-invoice.label': 'First invoice raised',
  'award.m-first-invoice.blurb': 'The engagement is now revenue-generating.',
  'award.m-first-hire.label': 'Headcount approved',
  'award.m-first-hire.blurb': 'One junior. The requisition took four weeks.',
  'award.m-hundred.label': 'One hundred tickets closed',
  'award.m-hundred.blurb': 'Velocity is trending in the right direction.',
  'award.m-tier1.label': 'ADR-1 approved',
  'award.m-tier1.blurb': 'The framework is now load-bearing and unmaintained.',
  'award.m-tier2.label': 'ADR-2 approved',
  'award.m-tier2.blurb':
    'The duplication is now a pattern, and patterns are best practice.',
  'award.m-tier3.label': 'ADR-3 approved',
  'award.m-tier3.blurb':
    'Delivery is now distributed across every timezone at once.',
  'award.m-tier4.label': 'ADR-4 approved',
  'award.m-tier4.blurb':
    'Nobody on the engagement can say which lines a person wrote.',
  'award.m-tier5.label': 'ADR-5 approved',
  'award.m-tier5.blurb':
    'Throughput per head has never been higher. Bus factor: one.',
  'award.m-tier6.label': 'ADR-6 approved',
  'award.m-tier6.blurb':
    'The services are load-bearing and nobody knows what they bear.',
  'award.m-tier7.label': 'ADR-7 approved',
  'award.m-tier7.blurb':
    'Two systems, one truth, and we are paid to reconcile them.',
  'award.m-tier8.label': 'ADR-8 approved',
  'award.m-tier8.blurb': 'There is no tier after this one.',
  'award.a-250.label': 'Two hundred and fifty',
  'award.a-250.blurb':
    'Close 250 work items. The board does not look any emptier.',
  'award.a-first-thousand-billed.label': 'Billable',
  'award.a-first-thousand-billed.blurb':
    'Bill €1,000. The engagement is now worth having.',
  'award.a-works-on-my-machine.label': 'Works on my machine',
  'award.a-works-on-my-machine.blurb':
    'An auto-closed ticket found the train away and shipped straight to prod.',
  'award.a-500.label': 'Five hundred',
  'award.a-500.blurb':
    'Close 500 work items. Two hundred and fifty of them came back.',
  'award.a-ten-thousand-billed.label': 'Somebody upstairs noticed',
  'award.a-ten-thousand-billed.blurb':
    'Bill €10,000. Somebody upstairs has noticed the account.',
  'award.a-sprints-fifty.label': 'Fifty sprints',
  'award.a-sprints-fifty.blurb':
    'Fifty ceremonies. Fifty burndown charts. One codebase, worse.',
  'award.a-thousand.label': 'Thousand-ticket engagement',
  'award.a-thousand.blurb': 'Close 1,000 work items.',
  'award.a-war-room.label': 'Standing war room',
  'award.a-war-room.blurb':
    'Put a senior on the escalations and leave the rest to the crew.',
  'award.a-bench.label': 'Bench of twenty',
  'award.a-bench.blurb': 'Twenty developers on the floor at once.',
  'award.a-skimmer.label': 'Creative accounting',
  'award.a-skimmer.blurb':
    'Book billed revenue as Story Points. Finance signed off.',
  'award.a-million.label': 'Key account',
  'award.a-million.blurb': 'Bill €1,000,000 across the engagement.',
  'award.a-ten-thousand.label': 'Industrial grooming',
  'award.a-ten-thousand.blurb':
    'Close 10,000 work items. None of them are fixed.',
  'award.a-server.label': 'It hums',
  'award.a-server.blurb':
    'Build the Server Room. It does nothing. You paid for it anyway.',
  'award.a-office.label': 'The whole floor',
  'award.a-office.blurb':
    'Build every room. There is nowhere left to put anyone.',
  'award.a-hundred-thousand.label': 'The backlog has a backlog',
  'award.a-hundred-thousand.blurb':
    'Close 100,000 work items. The backlog has never been longer.',
  'award.a-billion.label': 'The client is a subsidiary now',
  'award.a-billion.blurb':
    'Bill €1,000,000,000. The engagement is now the client.',
  'award.a-ladder.label': 'Every decision approved',
  'award.a-ladder.blurb': 'All eight ADRs. There was never a cleanup path.',
  'award.a-million-tickets.label': 'Half a million tickets',
  'award.a-million-tickets.blurb':
    'Close 500,000 work items. The client has stopped reading them.',
  'award.a-rate-card.label': 'The rate card, revised',
  'award.a-rate-card.blurb': 'Five revisions. It has still never gone down.',
  'award.a-secret.label': 'You read the code',
  'award.a-secret.blurb': 'Nobody has opened that file since 2011.',
  'adr.1.context':
    'Ticket volume has outgrown manual triage. A framework upgrade was scoped and rejected on cost. Feature velocity is flat.',
  'adr.1.decision':
    'Adopt Legacy Framework as the platform baseline. The current version will not be upgraded. Legacy Defects are expected output, not incidents.',
  'adr.1.consequences':
    'Legacy Defects now spawn continuously across the board. The framework is now load-bearing and unmaintained.',
  'adr.2.context':
    'Onboarding time for new hires was judged too long. A style guide was proposed and shelved in favour of an internal wiki page titled "Just copy an existing service."',
  'adr.2.decision':
    'Codify copy-paste as the standard method of extending the system. Deduplication is deprioritised indefinitely.',
  'adr.2.consequences':
    'Flaky Tests now spawn across the board and respawn once after closing, billing twice for the same defect. The duplication is now a pattern, and patterns are best practice.',
  'adr.3.context':
    'Delivery capacity did not scale with backlog growth. A vendor was engaged across three time zones, with no shared style guide, code owner, or onboarding process.',
  'adr.3.decision':
    'Route a majority of new feature work through offshore contracting. Reviews are conducted asynchronously, where they are conducted at all.',
  'adr.3.consequences':
    'Merge Conflicts spawn at volume, around the clock. The board floods and income jumps by an order of magnitude. Delivery is now distributed across every timezone at once.',
  'adr.4.context':
    'Throughput per engineer has plateaued. A licence for an assistive coding tool was approved on the basis of a vendor deck and a two-week trial nobody wrote up.',
  'adr.4.decision':
    'Generate new code by default. Review is advisory. Output that compiles is treated as output that works.',
  'adr.4.consequences':
    'Hallucinated Imports spawn across the board. Each reads as correct and is not; the defect is found downstream, at our day rate. Nobody on the engagement can now say which lines were written by a person.',
  'adr.5.context':
    'Delivery of the assistive-tooling backlog slipped. One engineer consistently closes more tickets than the rest of the team combined and has asked to work unblocked.',
  'adr.5.decision':
    'Grant unrestricted commit access to the highest-performing engineer. Suspend review, pairing and retro attendance for that engineer only.',
  'adr.5.consequences':
    'Force Pushes land on main and spawn work for everyone else. Throughput per head is now our highest ever and our bus factor is one. The retro has been made optional, which has resolved the complaints about the retro.',
  'adr.6.context':
    'Following the departure of the highest-performing engineer, four production services were found to have no listed owner. Ownership was requested in a channel that no longer has members.',
  'adr.6.decision':
    'Leave the unowned services running. Do not decommission what cannot be traced. Route their alerts to the on-call rotation.',
  'adr.6.consequences':
    'The 3AM Page spawns continuously and comes back after it is closed, billing the same incident twice. Nothing is fixed, because nothing can be found. The services are load-bearing and nobody knows what they bear.',
  'adr.7.context':
    'A platform audit found the system unmaintainable. The estimate to remediate incrementally exceeded the estimate to rebuild, because the rebuild was estimated by the team proposing it.',
  'adr.7.decision':
    'Begin a full rewrite on a new stack. Run both systems in parallel indefinitely. Feature parity is a phase-two concern.',
  'adr.7.consequences':
    'Migration Fallout spawns at scale as the two systems disagree about the truth. We are now paid to maintain the old system, build the new one, and reconcile them. This is the most profitable quarter on record.',
  'adr.8.context':
    'The rewrite is behind. Headcount is capped. A proposal was circulated to close the gap without hiring, and approved in the same meeting it was presented.',
  'adr.8.decision':
    'Grant autonomous agents commit and merge rights against both systems. Set no limit on concurrent work. Human review is retained in the process diagram.',
  'adr.8.consequences':
    'Autonomous PRs spawn without limit and at the highest value on the board. The engagement is now billing for work it did not do, to fix work it did not write, on a system nobody has read. There is no tier after this one.',
  'client.engagement': 'Platform Modernisation Programme',
  'approval.by.halloran': 'D. Halloran',
  'approval.by.achterberg': 'R. Achterberg',
  'approval.by.board': 'Programme Board',
  'approval.role.head': 'Head of Delivery',
  'approval.role.director': 'Director of Delivery',
  'approval.role.interim': 'Interim Head of Delivery',
  'approval.role.quorum-two': 'quorum of two',
  'approval.role.quorum-none': 'quorum not recorded',
  'approval.by.agent': 'Meridian Procurement Agent',
  'approval.role.procurement': 'automated, quorum not required',
  'adr.epic': 'Epic',
  'adr.subheading': 'Architecture Decision Record',
  'adr.acknowledge': 'Acknowledge',
  'adr.context': 'Context',
  'adr.decision': 'Decision',
  'adr.consequences': 'Consequences',
  'adr.approved': 'Approved',
  'adr.date': 'Date',
  'adr.comments': 'Comments',
  'postmortem.closed': 'Engagement closed',
  'postmortem.heading': 'Post-Mortem',
  'postmortem.scope.final': 'Retrospective — {{tier}} engagement, all sprints.',
  'postmortem.distribution':
    'Distribution: Programme Board, Delivery, Vendor Management',
  'postmortem.burndown': 'Sprint burn-down',
  'postmortem.burndown.aria':
    'Tickets outstanding rose to {{peak}} over {{minutes}} minutes against an ideal descent to zero',
  'postmortem.legend.actual': 'Outstanding — {{peak}} at its worst',
  'postmortem.legend.ideal': 'Ideal, rebaselined',
  'postmortem.legend.adr': 'ADR approved',
  'postmortem.well': 'What went well',
  'postmortem.badly': 'What did not go well',
  'postmortem.actions': 'Action items',
  'postmortem.outside': 'The engagement, from outside',
  'postmortem.well.closed': '{{closed}} tickets closed over the engagement.',
  'postmortem.well.billed':
    '{{billed}} billed to {{client}}, across {{sprints}} sprints.',
  'postmortem.well.tier':
    'ADR-{{adr}} ({{tier}}) reached full production status.',
  'postmortem.well.awards':
    '{{unlocked}} of {{total}} achievements confirmed by the crew.',
  'postmortem.well.rewards':
    'Achievements paid out {{euros}} and {{sp}} SP; the rest were just for the record.',
  'postmortem.badly.adrs':
    'Every Architecture Decision Record made the codebase permanently worse. None were reverted, none were on the agenda to be, and each was approved in writing by {{client}}.',
  'postmortem.badly.backlog':
    'The backlog was, at no point during the engagement, empty.',
  'postmortem.badly.headcount':
    'Headcount was added faster than the backlog shrank, at every tier.',
  'postmortem.action.gender':
    'The steering committee asked for crew throughput by gender. Request declined; throughput is a property of the process. Owner: HR.',
  'postmortem.action.load':
    'Investigate why {{tier}} is now load-bearing. Owner: unassigned.',
  'postmortem.action.assisted':
    'Engagement figures include budget booked outside the billing system. Owner: unassigned.',
  'postmortem.action.retro':
    'Schedule a retrospective on this retrospective. Owner: unassigned.',
  'buyNext.heading': 'Buy next',
  'buyNext.subheading':
    'The Synergy Analyser’s pick for your Story Points, wherever it hangs on the tree.',
  'buyNext.buy': 'Buy',
  'buyNext.cost': 'Costs {{cost}}',
  'buyNext.credit': 'On credit',
  'buyNext.goTo': 'Show in tree',
  'achievements.heading': 'Achievements',
  'achievements.subheading':
    'Recognition register — confirmed on outcome, never on effort, paid on confirmation.',
  'achievements.count': '{{confirmed}}/{{total}} confirmed',
  'achievements.column.award': 'Achievement',
  'achievements.column.status': 'Status',
  'achievements.unconfirmed': 'Unconfirmed',
  'achievements.confirmed': 'Confirmed',
  'rail.heading': 'The Practice',
  'rail.subheading': 'Bought while the board fills.',
  'rail.shop': 'Shop',
  'rail.buyable': 'something to buy',
  'rail.buyMax': 'buy max',
  'rail.crew.note': 'Lines open on the tree; heads are hired here.',
  'rail.maxed': 'MAX',
  'rail.on-tree': 'on the tree',
  'credits.free': 'free software under the',
  'credits.source': 'source at',
  'credits.hide': 'Hide credits',
  'credits.show': 'Credits',
  'credits.copyleft': 'The crew art carries its own copyleft:',
  'moment.secret.subheading': 'Undocumented',
  'moment.secret.chip': 'Found',
  'moment.secret.action': 'Close the file',
  'moment.secret.finding': 'Finding',
  'moment.secret.finding.body':
    'Nobody has opened that file since 2011. The TODO is older than the framework it was written against and older than three of the people who have since owned this repository. It was not removed before launch. It will not be removed before the next one. Everything bills slightly better now.',
  'crew.tally.juniors': '{{count}} juniors on the floor',
  'crew.tally.seniors': '{{count}} seniors on the floor',
  'crew.tally.managers': '{{count}} managers on the floor',
  'epic.0.name': 'A New Backlog',
  'epic.1.name': 'The Legacy Strikes Back',
  'epic.2.name': 'Return of the Clipboard',
  'epic.3.name': 'The Merge Awakens',
  'epic.4.name': 'Attack of the AI',
  'epic.5.name': 'Revenge of the Force Push',
  'epic.6.name': 'Night of the Living Service',
  'epic.7.name': 'The Phantom Rewrite',
  'epic.8.name': 'Rise of the Machines',
  'epic.acceptance.name': 'The Last Sign-Off',
  'skill.status.credit':
    'Approve on credit: {{owed}} SP owed, repaid from half of every later pickup',
  'hud.debt': 'repaying {{owed}} SP',
  'hud.goal.credit': '{{pct}} % to ADR-{{adr}} · approvable on credit',
  'acceptance.card.kicker': 'Acceptance · {{n}} of {{of}} signed',
  'acceptance.card.retest': 'Re-test · {{n}} of {{of}} signed',
  'acceptance.card.ask': 'Sweep up the pink tickets:',
  'acceptance.card.count': '{{picked}} of {{goal}} picked up',
  'acceptance.card.discount': '−{{n}} from your nodes',
  'acceptance.card.weight': 'each counts ×{{n}}',
  'acceptance.card.finisher': '×{{n}} needs {{name}}',
  'acceptance.card.rule': 'miss it: re-test, pickups kept · overtime ×{{mult}}',
  'acceptance.card.steps': 'Acceptance criteria',
  'acceptance.card.crew':
    'The crew is in the acceptance meeting. Only your hand counts.',
  'board.jackpot':
    'PERFECT STORM — the whole board billed under escalation and hotfix',
  'release.phase.incident': 'Incident Review',
  'release.phase.incident.short': 'P0 Review',
  'acceptance.criterion.0.label': 'CODE STYLE',
  'acceptance.criterion.1.label': 'BACKWARDS COMPATIBILITY',
  'acceptance.criterion.2.label': 'TEST SUITE',
  'acceptance.criterion.3.label': 'MERGE STRATEGY',
  'acceptance.criterion.4.label': 'DOCUMENTATION',
  'acceptance.criterion.5.label': 'KNOWLEDGE TRANSFER',
  'acceptance.criterion.6.label': 'DECOMMISSIONING',
  'acceptance.criterion.7.label': 'ARCHITECTURE',
  'acceptance.criterion.8.label': 'PERFORMANCE',
  'award.c-criterion-0.label': 'Accepted: code style consistent',
  'award.c-criterion-0.blurb': 'Every file now fails the same linter rules.',
  'award.c-criterion-1.label': 'Accepted: backwards compatible',
  'award.c-criterion-1.blurb':
    'Everything that was broken before is broken in exactly the same way.',
  'award.c-criterion-2.label': 'Accepted: test suite green',
  'award.c-criterion-2.blurb': 'Green on the third retry counts as green.',
  'award.c-criterion-3.label': 'Accepted: merge strategy agreed',
  'award.c-criterion-3.blurb': 'Both sides of every conflict were kept.',
  'award.c-criterion-4.label': 'Accepted: documentation complete',
  'award.c-criterion-4.blurb':
    'The screenshot of the whiteboard has been attached to the ticket.',
  'award.c-criterion-5.label': 'Accepted: knowledge transferred',
  'award.c-criterion-5.blurb':
    'He sent a Loom. It is forty minutes long. Nobody has watched it.',
  'award.c-criterion-6.label': 'Accepted: decommissioning scheduled',
  'award.c-criterion-6.blurb':
    'The zombie service has a sunset date. It had one last year too.',
  'award.c-criterion-7.label': 'Accepted: architecture future-proof',
  'award.c-criterion-7.blurb':
    'The rewrite of the rewrite has its kickoff on Monday.',
  'award.c-criterion-8.label': 'Accepted: performance acceptable',
  'award.c-criterion-8.blurb':
    'Nobody measured. The agents report no regressions observed.',
  'award.a-hundred-billion.label': 'A second client',
  'award.a-hundred-billion.blurb':
    'Bill €100 billion. The client has started a second client to pay for the first.',
  'award.a-trillion.label': 'Line item',
  'award.a-trillion.blurb':
    'The engagement is now a line item in the client’s annual report. Its own section, actually.',
  'award.a-ten-trillion.label': 'Macroeconomic indicator',
  'award.a-ten-trillion.blurb':
    'Bill €10 trillion. Economists have begun citing the burndown chart.',
  'award.a-hundred-trillion.label': 'Invoice inception',
  'award.a-hundred-trillion.blurb':
    'Bill €100 trillion. The invoice has its own invoice.',
  'award.a-quadrillion.label': 'Weather system',
  'award.a-quadrillion.blurb':
    'Finance has stopped using the word “budget”. It now says “weather”.',
  'award.a-ten-quadrillion.label': 'Small engagement',
  'award.a-ten-quadrillion.blurb':
    'Bill €10 quadrillion. The client still calls it a “small engagement”.',
  'award.a-perfect-storm.label': 'Perfect storm',
  'award.a-perfect-storm.blurb':
    'Hotfix, escalation, then quarter end: the whole board billed at once, under both.',
  'award.a-incident-review.label': 'Blameless post-mortem',
  'award.a-incident-review.blurb':
    'A P0 was still open when the train left, so the release waited for the incident review. The review blamed the train.',
  'award.a-on-credit.label': 'Approved on credit',
  'award.a-on-credit.blurb':
    'Signed an ADR before it was paid for. Technical debt, but literal.',
  'moment.closeout.heading': 'Closeout Record — Engagement Acceptance',
  'moment.closeout.subheading': 'Final decision of record',
  'moment.closeout.chip': 'Signed',
  'moment.closeout.action': 'To the board: start the push',
  'moment.closeout.context':
    'Eight Architecture Decision Records have been approved and none reverted. The backlog is at an all-time high. The client has asked for the engagement to be closed out before the next budget cycle.',
  'moment.closeout.decision':
    'Enter formal acceptance. The client tests the delivery one criterion at a time, one line of work per criterion. The crew sits in the acceptance meeting; the tickets are yours to pick up.',
  'moment.closeout.consequences':
    'Each test runs fifteen seconds; what its line delivers in that time is marked pink. Pick up enough of them by hand and the criterion signs when the time is up: an award and more overtime on every ticket. Fall short and the line goes to the back of the queue for a ten-second re-test, its pickups kept. Every node bought on a line lowers its goal; its double or retainer counts each pickup one and a half times. Open hotfixes, escalations, quarter ends, pizza vouchers and P0s are void, and none arrive during the push.',
  'moment.closeout.approved':
    'Meridian Procurement Agent (automated), on behalf of the Programme Board, quorum not required.',
  'moment.closeout.comments': 'LGTM.',
  'postmortem.stamp': 'ACCEPTED',
  'postmortem.stamp.by': 'Meridian Financial Group · signed without reading',
  'postmortem.well.criteria.all':
    'All {{total}} acceptance criteria verified on the first pass. Audit has asked how.',
  'postmortem.well.criteria.retest':
    'All {{total}} acceptance criteria verified, after one re-test. The findings were closed as resolved.',
  'award.a-findings.label': 'Sent back',
  'award.a-findings.blurb':
    'A criterion missed its goal and went back into the queue. The client called it diligence.',
  'award.a-over-budget.label': 'Over budget',
  'award.a-over-budget.blurb':
    'The budget passed €20 Qa before the last criterion was signed. The client approved an increase to match.',
  'board.buff.escalation.held':
    'ESCALATION ON THE BOARD · HOLD IT FOR A QUARTER END',
  'board.buff.combo':
    'HOTFIX ON THE BOARD · SWEEP IT, THEN THE ESCALATION, THEN THE QUARTER END',
  'board.buff.combo.live':
    'HOTFIX LIVE · SWEEP THE ESCALATION, THEN THE QUARTER END',
  'postmortem.well.criteria.retests':
    'All {{total}} acceptance criteria verified, after {{findings}} re-tests. The findings were closed as resolved.',
  'award.c-findings-0.label': 'Re-test: code style',
  'award.c-findings-1.label': 'Re-test: backwards compatibility',
  'award.c-findings-2.label': 'Re-test: test suite',
  'award.c-findings-3.label': 'Re-test: merge strategy',
  'award.c-findings-4.label': 'Re-test: documentation',
  'award.c-findings-5.label': 'Re-test: knowledge transfer',
  'award.c-findings-6.label': 'Re-test: decommissioning',
  'award.c-findings-7.label': 'Re-test: architecture',
  'award.c-findings-8.label': 'Re-test: performance',
  'award.c-findings-0.blurb': 'The linter has been added to the backlog.',
  'award.c-findings-1.blurb':
    'Compatibility will be restored in a future release.',
  'award.c-findings-2.blurb': 'The flaky test has been marked flaky.',
  'award.c-findings-3.blurb': 'The conflict has been assigned to both teams.',
  'award.c-findings-4.blurb': 'The documentation is scheduled for Phase Two.',
  'award.c-findings-5.blurb':
    'He left before the handover. The Loom is still forty minutes.',
  'award.c-findings-6.blurb':
    'The zombie service outlived its own decommissioning ticket.',
  'award.c-findings-7.blurb': 'The target architecture has been re-baselined.',
  'award.c-findings-8.blurb':
    'Performance will be measured once the agents agree on a metric.',
  'skill.contractRockstar.1.label': 'Hero Engagement',
  'skill.contractRockstar.blurb':
    'The Rockstar signs for the whole programme at once. No ranks, no negotiation.',
  'skill.retainerRockstar.1.label': 'On-Call Heroics',
  'skill.retainerRockstar.blurb':
    'A monthly retainer for heroics: force pushes come faster and bill several times over.',
  'skill.contractZombie.1.label': 'Undead SLA',
  'skill.contractZombie.blurb':
    'The undead service gets an SLA nobody can meet, and bills for missing it.',
  'skill.retainerZombie.1.label': 'Night Shift Retainer',
  'skill.retainerZombie.blurb':
    'Night shifts on retainer: more 3AM pages, each billed at night rates.',
  'skill.contractRewrite.1.label': 'Rewrite Programme',
  'skill.contractRewrite.blurb':
    'The rewrite is sold as one programme, phases, fallout and all.',
  'skill.retainerRewrite.1.label': 'Side-by-Side Retainer',
  'skill.retainerRewrite.blurb':
    'Old and new run side by side, and both are on the invoice.',
  'skill.contractSwarm.1.label': 'Agent Fleet Licence',
  'skill.contractSwarm.blurb':
    'A fleet licence: every autonomous PR is estimated before anyone reads it.',
  'skill.retainerSwarm.1.label': 'Human Review Retainer',
  'skill.retainerSwarm.blurb':
    'A human reviews every autonomous PR, by the hour.',
};
