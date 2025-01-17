
function formatLeaderboard(leaderboard) {
  if (leaderboard.startsWith('rm_')) {
    return 'Ranked ' + leaderboard.substring(3);
  } else if (leaderboard.startsWith('qm_')) {
    return 'QM ' + leaderboard.substring(3);
  } else {
    return leaderboard;
  }
}

function formatRankLevel(rank_level) {
  if (!rank_level)
    return '';
  const sp = rank_level.split('_');

  return sp[0][0].toUpperCase() + sp[1];
}

function formatDuration(elapsed) {
  const minutes = Math.floor(elapsed / 60);
  const hours = Math.floor(elapsed / 60 / 60);
  const days = Math.floor(elapsed / 3600 / 24);

  if (days == 1)
    return `${days} day`;
  if (days > 1)
    return `${days} days`;
  if (hours == 1)
    return `${hours} hour`;
  if (hours > 1)
    return `${hours} hours`;
  return `${minutes} min`;
}

function formatAge(date) {
  const elapsed = (Date.now() - Date.parse(date)) / 1000;
  return formatDuration(elapsed);
}

class NightbotDefaultFormatter {
  constructor(format) {
    this.format = format;
    // This needs to be updated when new civs get added
    this.civNames = {
      'mongols': 'Mongols',
      'rus': 'Rus',
      'english': 'English',
      'french': 'French',
      'holy_roman_empire': 'HRE',
      'abbasid_dynasty': 'Abbasid',
      'chinese': 'Chinese',
      'delhi_sultanate': 'Delhi'
    };
  }

  formatCiv(civ) {
    return this.civNames[civ] || civ;
  }

  formatMatchPlayer(match, player, short) {
    const mode = player.modes[match.kind];

    var msg = player.name;
    if (!short && mode && mode.rating) {
      const rank = mode.rank ? `#${mode.rank} ` : '';
      const rank_level = mode.rank_level ? formatRankLevel(mode.rank_level) + ', ' : '';
      msg += ` ${rank}(${rank_level}${mode.rating} Elo)`;
    }

    if (short) {
      msg += ` (${this.formatCiv(player.civilization)})`;
    } else {
      msg += ` - ${this.formatCiv(player.civilization)}`;
    }

    return msg;
  }

  formatMatchTeam(match, team, short) {
    return team.map(p => this.formatMatchPlayer(match, p, short)).join(', ');
  }

  sendError(msg, res) {
    res.send(`Error: ${msg}`);
  }

  sendMatch(match, res) {
    const numTeams = match.teams.length;
    const numPlayers = match.teams.flat().length;
    const useShortFormat = numPlayers > 3; // Keep showing elo for 1v2 games. if we ever get custom.

    var msg;
    if (numTeams == 2) {
      const teamA = this.formatMatchTeam(match, match.teams[0], useShortFormat);
      const teamB = this.formatMatchTeam(match, match.teams[1], useShortFormat);

      msg = `==> ${match.map} <==`;
      if (!match.ongoing) {
        const  team1W = match.teams[0].filter(p => p.result == 'win').length;
        const  team2W = match.teams[1].filter(p => p.result == 'win').length;
        msg = `[${team1W?'W':'L'}] ${msg} [${team2W?'W':'L'}]`;
      }
      msg = `${teamA} ${msg} ${teamB}`;
    } else if (numPlayers == numTeams) {
      const teams = match.teams.map(t => this.formatMatchTeam(match, t, true)).join(', ');
      msg = `FFA on ${match.map} between ${teams}`;
    } else {
      const teams = match.teams.map(t => this.formatMatchTeam(match, t, true)).join(' vs ');
      msg = `Custom on ${match.map} between ${teams}`;
    }
    msg += `, ${formatAge(match.started_at)} ago`;
    res.send(msg);
  }

  sendRank(player, leaderboard, res) {
    const mode = player.modes[leaderboard];

    if (!mode) {
      var msg = `${player.name} is unranked in ${formatLeaderboard(leaderboard)}`;
      res.send(msg);
      return;
    }

    const rank = mode.rank ? `rank ${mode.rank}` : 'unranked';
    const rank_level = mode.rank_level ? formatRankLevel(mode.rank_level) + ', ' : '';
    var msg = `${player.name} is ${rank} (${rank_level}${mode.rating} Elo), with ${mode.games_count} game${mode.games_count == 1?'':'s'} (${mode.wins_count}-${mode.losses_count} | ${mode.win_rate}%)`;

    if (Number.isInteger(mode.streak)) {
        const streak = parseInt(mode.streak) < 0 ? "losing" : "win";
        msg += `, on a ${Math.abs(mode.streak)}-game ${streak} streak`;
    }
    msg += ` [last played ${formatAge(mode.last_game_at)} ago]`;

    res.send(msg);
  }

  sendWinRate(winrate, res) {
    var msg = `${winrate.player.name} played ${winrate.games_count} game${winrate.games_count == 1?'':'s'}`;

    if (winrate.games_count) {
      msg += ` (${winrate.wins_count}-${winrate.losses_count} | ${winrate.win_rate}%)`;
    }

    if (winrate.duration) {
      msg +=  ` lasting ${formatDuration(winrate.duration)}`;
    }

    if (winrate.opponent) {
      msg += ` vs ${winrate.opponent.name}`;
    }

    if (winrate.last_game_at) {
      msg += `, ${formatAge(winrate.last_game_at)} ago`;
    }

    res.send(msg);
  }
}

class JsonFormatter {
  constructor(format) {
    this.format = format;
  }

  sendError(msg, res) {
    res.json({ error: msg });
  }

  sendMatch(match, res) {
    res.json(match);
  }

  sendRank(player, leaderboard, res) {
    res.json(player);
  }

  sendWinRate(winrate, res) {
    res.json(winrate);
  }
}

function getFormatter(format) {
  if (!format) {
    return new JsonFormatter(format);
  } else if (format == 'nightbot') {
    return new NightbotDefaultFormatter(format);
  }

  return null;
}

module.exports = {
  getFormatter
};
