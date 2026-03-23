# In-Game Formula

These are some of the equations that affect various role playing game parameters in some *Castlevania* titles, particularly the metroidvania genre.

## *Castlevania: Circle of the Moon*
### Damage calculation
#### Attacking enemies
To calculate damage inflicted to enemies, we need to calculate the power of the attack.
- If it's a physical attack (whip attack, slide or tackle), then:
::***Power = STR + DSS enhanced STR***
- If it's with a sub-weapon or Item Crash attack, then:
::***Power = STR x STR rate***
- If it's a DSS attack, then:
::***Power = STR + DSS enhanced STR***
::***Power = Power x DSS power***
::(Example: Diana + Cockatrice combination)
- If it's a DSS attack with a constant modifier, then:
::***Power = DSS power***
::(Example: Diana + Salamander combination)
- Damage inflicted to an enemy is:
::***Damage = (Power x Power) / (10x Enemy Defense)***
- If the enemy is resistant to the element:
::***Damage = Damage / 2***
- If calculated damage is less than 1, then:
::***Damage = 1***

#### Damage taken from enemies
- The power from enemies attack is:
::***Power = Enemy STR x Attack modifier***
::Where in most cases, body contact has an attack modifier equal to 1.
- Damage received from an enemy is:
::***Damage = (Power x Power) / (10x Defense)***
- If Nathan is frozen, then:
::***Damage = Damage x 4***
- If calculated damage is less than 1, then:
::***Damage = 1***

### Experience growth
- Total required experience to reach certain level is
::***EXP = floor(0.3 x (Level)⁴ + 1.8 x (Level)³ + 3.3 x (Level)² + 0.6 x (Level-1)² + 184.8 x Level - 0.6)***

## *Castlevania: Aria of Sorrow*
### Damage calculation
#### Attacking enemies
Note that in this section, stone, poison, and curse are not considered as an element. An attack is considered effective if at least one of the element is effective. An attack is resisted if the attack has at least one element, all element beside Sword element is resisted, or if the attack only has Sword element, it's resisted.
- If jump kick:
::***Power = STR x 1/2***
- If slide:
::***Power = STR x 15/16***
- If Weapon or hand combat:
::***Power = ATK***
- If Bullet Soul:
::***Power = STR x Soul AP***
::***Power = Power / 10***
::***Power = Power + INT/4***
::***Power = Power + 6x Soul AP***
::***Power = Power / 16***
- If Guardian Soul:
::***Power = Soul AP/8***
::***Power = Power x INT/2***
::***Power = Power + Soul AP***
- If Hard Mode:
::***Power = Power x 4/5***
- If weapon has *half damage effect* (such as Handgun):
::***Power = Power/2***
- If enemy is being petrified (enemy is weak against stone, and has not been petrified yet):
::***Power = 0***
::*skip other status effect*
- If enemy is poisoned:
::***Enemy DEF = 0***
- If enemy is vulnerable to curse and is attacked with curse type attack:
::***Power = Power + Enemy HP/4***
- If enemy is vulnerable to HP/MP swap, and has not been swapped yet:
::***Swap HP and MP***
- If the only effective element is Sword element:
::***Power = Power + Power/4***
- If at least one element beside Sword element is effective:
::***Power = Power x 2***
- If the attack is resisted:
::***Power = Power - Power/2***
- Damage Formula:
::***Damage = (Power - Enemy DEF/2) x (256 - Enemy DEF)/256***
- If calculated damage is less than 1:
::***Damage = 1***
- If enemy is petrified
::***Damage = Damage x 2***

#### Damage taken from enemies

- If it's an enemy attack:
::***Power = Enemy STR x Attack modifier***
- If it's spike damage:
::***Power = (3 x (DEF - CON/2)) / 4*** (DEF is calculated before Basilisk's soul bonus)
::***Power = Power + Max HP/16***
- If it's damage from the moving floor trap (like the one in Study):
::***Power = (3 x (DEF - CON/2)) / 4*** (DEF is calculated before Basilisk's soul bonus)
::***Power = (Power + Max HP/16) / 3***
- Damage formula (Normal Mode):
::***Damage = 2x Power - DEF***
- Damage formula (Hard Mode):
::***Damage = (3 x (DEF - CON/2)) / 4*** (DEF is calculated before Basilisk's soul bonus)
::***Damage = (Damage + Max HP/16) / 2***
::***Damage = (Damage + 5x Power - 2x DEF) / 2***
- If petrified, then:
::***Damage = Damage x 2***
- If strong against the element:
::***Damage = Damage / 2***<br />

### Status modifier
#### Poison
- Without Zombie soul equipped:
::***STR = STR/4***
::***CON = CON/4***
::***INT = INT/4***

- With Zombie soul equipped:
::***STR = STR + ((STR/8) x 3)***
::***CON = (CON/8) x 11***
::***INT = (INT/8) x 11***

- Poisoned Enemy
::***STR = STR - STR/4***
::***DEF = 0***

### Drop rate
#### Soul drop rate
The formula will not be executed in Julius Mode or if the rarity of the soul is 0. Note that souls with 100% chance are gathered through event.

- If it's normal mode:
::***Chance = 6***

- If it's hard mode:
::***Chance = 7***

- If the soul has been captured previously:
::***Chance = 3***

- If Soul Eater Ring is equipped:
::***Chance = Chance + 8***

      - Rarity = (Soul Rarity x8) + 32 - (LCK/16)***
::If Rarity is less than 16, set Rarity = 16

- Chance of getting enemy's soul
::***Chance = Chance/Rarity***

#### Item drop rate
The formula is calculated if the soul from previous calculation isn't acquired. Julius Mode skip this.

- If Rare Ring isn't equipped:
::***Chance of common drop = 3/4***
::***Chance of rare drop = 1/4***

- If Rare Ring is equipped:
::***Chance of common drop = 5/8***
::***Chance of rare drop = 3/8***

- If enemy has no item on the selected (either common or rare) slot:
::***No item dropped***

- Item rarity
::***Rarity = drop rarity (depends on the slot)***
::***Rarity = (Rarity x4) + 16 - (LCK/16)***
::***If Rarity is less than 16, set Rarity = 16***

- If Rare Ring isn't equipped
::***Chance = 4/rarity***

- If Rare Ring is equipped
::***Chance = 8/rarity***

#### Gold drop rate
The formula is calculated if Soma hasn't got anything from previous steps. Julius Mode skip this.
- If enemy doesn't have any dropped item:
::***No Gold dropped***

- If Gold Ring isn't equipped:
::***Chance = 1/128***
::***Chance of getting $1, $10, $50, and $100 is equal (1/4 Chance).***

- If Gold Ring is equipped:
::***Chance = 1/16***
::***Chance of getting $100, $500, $1000, and $2000 is equal (1/4 Chance).***

#### Heart drop rate
The formula is calculated if Soma hasn't got anything from previous steps. Julius Mode skip this.
- If enemy doesn't have any dropped item:
::***No Heart dropped***

- If Heart Pendant isn't equipped:
::***Chance = 1/128***

- If Heart Pendant is equipped:
::***Chance = 1/16***

- Chance of getting heart:
::Chance of getting a small heart is ***3/4 Chance***
::Chance of getting a large heart is ***1/4 Chance***

### Experience growth
- Total required experience to reach certain level (beyond level 1) is
::***EXP = Level x (Level + 1) x ((3x Level) + 8)***
::or
::***EXP = 3 x (Level)³ + 11 x (Level)² + 8 x Level***

- As a result, starting a new game over a completed save file will let Soma start with 22 EXP.


Category: Mechanics
Category: Aria of Sorrow
Category: Circle of the Moon
