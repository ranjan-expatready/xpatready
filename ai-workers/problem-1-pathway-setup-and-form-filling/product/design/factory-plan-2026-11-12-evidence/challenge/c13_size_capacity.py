# Size: re-weight card-format vs prose modules; Capacity: week-1 vs week-2 rates.
card={'SA-1B':218,'AG-7':111,'AG-19':20,'AG-2':109,'AG-4':50,'AG-6':65,'AG-5':64}
prose={'SA-1':48,'SA-5':103,'AG-3':41,'AG-8':43,'AG-9':71,'AG-15':58,'AG-17':96,'AG-10':88,'AG-11':120,'AG-12':109,'AG-13':48,'AG-14':39}
AB_card=['SA-1B','AG-7','AG-19']; AB_prose=['SA-1','SA-5','AG-3','AG-8','AG-9','AG-15','AG-17']
C_card=['AG-2','AG-4','AG-5','AG-6']; C_prose=['AG-10','AG-11','AG-12','AG-13','AG-14']
for pf in (0.4,0.5,0.6):
  for cpc in (0.9,1.23):
    ab=(sum(card[m] for m in AB_card)*0.85+sum(prose[m] for m in AB_prose)*pf)*cpc
    c=(sum(card[m] for m in C_card)*0.7+sum(prose[m] for m in C_prose)*pf)*cpc
    print(f'prose cards/req {pf} caps/card {cpc}: A+B caps {ab:.0f} (to build {ab-94:.0f}); C {c:.0f}; A+B+C to build {ab+c-94:.0f}')
# capacity by week
pr={'02':65,'03':58,'04':31,'05':23,'06':12,'07':25,'08':16,'09':25,'10':9,'11':18,'12':19}
wk={'02':11,'03':10,'04':1,'05':4,'06':4,'07':1,'08':11,'09':4,'10':8,'11':1}
w1=['02','03','04','05','06']; w2=['07','08','09','10','11']
for n,w in (('2-6 Nov',w1),('7-11 Nov',w2)):
    p=sum(pr[d] for d in w); k=sum(wk[d] for d in w); print(n,'app PRs/day',p/len(w),'first Works/day',k/len(w),'PRs per Works',round(p/k,1))
