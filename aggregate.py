import json
import csv
exec(open('scrape/o2cm/scrape.py').read())
exec(open('scrape/o2cm/flatten.py').read())

SHORTCUT_FILES = False

results = {}
# res_data.json
if (os.path.isfile('res_data.json') and SHORTCUT_FILES) :
    with open('res_data.json', 'r') as f:
        results = json.load(f)
    print('used existing res_data.json')
else:
    
    flat_comp = []
    # flat_comp.csv
    if (os.path.isfile('flat_comp.csv') and False) :
        with open('flat_comp.csv', 'r') as f:
            reader = csv.DictReader(f)
        print('used existing flat_comp.csv')
    else:
        
        init()
        links = comp_links()
        
        # for now, we'll just prototype on a single competition
        sample = links[0]
        
        comp_id = comp_id_from_link(sample[1])
        comp = competition_document('Sample',sample[1])
        flat_comp = flatten_comp(comp)
        
        # we write this as a csv, because that's the difference between a 5MB file and a 15MB one
        with open('flat_comp.csv', 'w', newline='') as f:
            writer = csv.DictWriter(f,['couple_location','round_id','mark','round_name','lead_name','follow_name','judge','result','value','heat_name','comp_name','dance_id','comp_id','heat_id','couple','judge_name','dance_name','final_result'])
            writer.writeheader()
            writer.writerows(flat_comp)
        print('wrote new flat_comp.csv')
        
    # flat_comp is a list of dict
    
    # let's aggregate our data:
    ## { event_id:{ 'name':name , 'num_judges':[(total_this_round,req_for_recall)] , str(couple) :(best_round_id,[final_marks,semi_marks,...]) } , event2_id:{...} }
    
    def couple(line) :
        return (str(line['couple']),str(line['lead_name']),str(line['follow_name']))
    
    results = {}
    for line in flat_comp :
        
        
        if (not line['heat_id'] in results) :
            results[line['heat_id']] = {'.name':line['heat_name'],'.judges':[],'.all_judges':[set()]}
        heat = results[line['heat_id']]
        
        if (not couple(line) in heat) :
            heat[couple(line)] = [-1,[[]]]
            
        round_id = int(line['round_id'])
        
        while (round_id >= len(heat['.all_judges'])) :
            heat['.all_judges'].append(set())
        heat['.all_judges'][round_id].add(line['judge'])
        
        if (round_id == 0) :
            heat[couple(line)][1][0].append(int(line['value']))
            heat[couple(line)][0] = 0
        else:
            while (round_id >= len(heat[couple(line)][1])) :
                heat[couple(line)][1].append(0)
            heat[couple(line)][1][round_id] += int(line['value'])
            
            if (round_id < heat[couple(line)][0] or heat[couple(line)][0] == -1) :
                heat[couple(line)][0] = round_id
    
    ret_results = []
    for heat_name in results :
        heat = results[heat_name]
        n_rounds = len(heat['.all_judges'])
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
                elif (ii > couple[0] and (couple[1][ii] < min_call[ii] or min_call[ii] == -1)) :
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
    with open('res_data.json', 'w') as f:
        json.dump(ret_results, f)
    print('wrote new res_data.json')