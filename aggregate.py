import json
import csv
exec(open('scrape/o2cm/scrape.py').read())
exec(open('scrape/o2cm/flatten.py').read())
SHORTCUT_FILES = True

YEAR_MIN = 2007
YEAR_MAX = 2020

n_comps = 0
n_marks = 0
n_couples = 0
n_heats = 0
n_events = 0
def log_status() :
    print(str(n_comps)+' comps')
    print(str(n_marks)+' marks')
    print(str(n_couples)+' couples')
    print(str(n_heats)+' heats')
    print(str(n_events)+' events')

def names(line) :
    return (str(line['couple']),str(line['lead_name']),str(line['follow_name']))

if (not os.path.isdir('data')) :
    os.mkdir('data')

init()
for link in comp_links() :
    n_comps += 1
    
    comp_id = comp_id_from_link(link[1])
    print('NEXT: '+link[0])

    if (not os.path.isdir('data/'+comp_id)) :
        os.mkdir('data/'+comp_id)
    
    results = {}
    # res_data.json
    if (os.path.isfile('data/'+comp_id+'/res_data.json') and SHORTCUT_FILES) :
        #with open('data/'+comp_id+'/res_data.json', 'r') as f:
        #    results = json.load(f)
        print('used existing res_data.json')
    else:
        
        flat_comp = []
        # flat_comp.csv
        if (os.path.isfile('data/'+comp_id+'/flat_comp.csv')) :
            with open('data/'+comp_id+'/flat_comp.csv', 'r') as f:
                reader = csv.DictReader(f)
                for line in reader :
                    flat_comp.append(line)
            print('used existing flat_comp.csv')
        else:
            comp = competition_document('Sample',link[1])
            flat_comp = flatten_comp(comp)
            
            n_marks += len(flat_comp)
            
            # we write this as a csv, because that's the difference between a 5MB file and a 15MB one
            with open('data/'+comp_id+'/flat_comp.csv', 'w', newline='') as f:
                writer = csv.DictWriter(f,['couple_location','round_id','mark','round_name','lead_name','follow_name','judge','result','value','heat_name','comp_name','dance_id','comp_id','heat_id','couple','judge_name','dance_name','final_result'])
                writer.writeheader()
                writer.writerows(flat_comp)
                #for row in flat_comp :
                    #enc = [str(str(s).encode("utf-8")) for s in row]
                    #writer.writerow(enc)
            print('wrote new flat_comp.csv')
            
        # flat_comp is a list of dict
        
        # let's aggregate our data:
        ## { event_id:{ 'name':name , 'num_judges':[(total_this_round,req_for_recall)] , str(couple) :(best_round_id,[final_marks,semi_marks,...]) } , event2_id:{...} }
        for line in flat_comp :
            if (not line['heat_id'] in results) :
                results[line['heat_id']] = {'.name':line['heat_name'],'.judges':[],'.all_judges':[set()]}
                n_events += 1
            heat = results[line['heat_id']]
            if (not names(line) in heat) :
                heat[names(line)] = [-1,[[]]]
                n_couples += 1
                
            round_id = int(line['round_id'])
            
            while (round_id >= len(heat['.all_judges'])) :
                heat['.all_judges'].append(set())
            heat['.all_judges'][round_id].add(line['judge'])
            
            if (round_id == 0) :
                heat[names(line)][1][0].append(int(line['value']))
                heat[names(line)][0] = 0
            else:
                while (round_id >= len(heat[names(line)][1])) :
                    heat[names(line)][1].append(0)
                heat[names(line)][1][round_id] += int(line['value'])
                
                if (round_id < heat[names(line)][0] or heat[names(line)][0] == -1) :
                    heat[names(line)][0] = round_id
        
        ret_results = []
        for heat_name in results :
            heat = results[heat_name]
            n_rounds = len(heat['.all_judges'])
            n_heats += n_rounds
            n_dances = 0
            min_call = [-1] * n_rounds
            max_cut = [0] * n_rounds
            for couple_name in heat :
                if couple_name[0] == '.' :
                    continue
                couple = heat[couple_name]
                
                # find a couple in the final (so that every judge submitted a mark for every dance)
                # divide by the number of marks by the number of judges to find the number of dances total
                if (n_dances == 0 and couple[0] == 0) :
                    n_dances = len(couple[1][0]) / len(heat['.all_judges'][0])
                
                couple = heat[couple_name]
                for ii in range(1,n_rounds) :
                    if (ii == couple[0] and couple[1][ii] > max_cut[ii]) :
                        max_cut[ii] = couple[1][ii]
                    else :
                        if (ii > couple[0] and ii < len(couple[1]) and (couple[1][ii] < min_call[ii] or min_call[ii] == -1)) :
                            min_call[ii] = couple[1][ii]
            heat['.judges'] = [(0,0)] * n_rounds
            
            for ii in range(0,n_rounds) :
                heat['.judges'][ii] = (len(heat['.all_judges'][ii])*n_dances,int((min_call[ii]+max_cut[ii]+1)/2))
                # for ii=0, this will be (judges_in_final,0), with the 0 junk.
                
            del heat['.all_judges']
            
            ret_heat = [{},[]]
            for (k,v) in heat.items() :
                if (k[0] == '.') :
                    ret_heat[0][k] = v
                else :
                    ret_heat[1].append((k,v))
            
            ret_results.append(ret_heat)
        
        # we write this as json, so we can get at it easier later
        with open('data/'+comp_id+'/res_data.json', 'w') as f:
            json.dump(ret_results, f)
        print('wrote new res_data.json')
    log_status()

xx = 0
if (not os.path.isfile('comps.json') or True) :
    comps = {}
    year = 0
    for link in comp_links() :
        comp_id = comp_id_from_link(link[1])
        if (not os.path.isdir('data/'+comp_id)) :
            continue
        try :
            year = 2000+int(comp_id[-2:])
        except ValueError :
            continue
        if (year<YEAR_MIN or year>YEAR_MAX) :
            continue
        
        comps[comp_id_from_link(link[1])] = [link[0],link[2][:-2]+', '+str(year)]
        print(str(year)+'  '+comp_id)
        xx += 1
    with open('comps.json', 'w') as f:
        json.dump(comps, f)
    print('wrote comps.json ('+str(xx)+' total)')