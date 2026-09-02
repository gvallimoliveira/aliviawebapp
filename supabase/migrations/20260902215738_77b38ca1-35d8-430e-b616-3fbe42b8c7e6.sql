with fix(nome, vid) as (values
 ('Elevação Lateral com Haltere','ORparUDksUk'),
 ('Prancha Lateral','zt7PjySXWCw'),
 ('Agachamento Sumô','oGUwNJAIRoc'),
 ('Agachamento na Parede','t6KeIiQAOkA'),
 ('Agachamento no Smith','7p_qycgzx4U'),
 ('Alfabeto com o Pé','XtZG-vJl5aY'),
 ('Alongamento Peitoral na Porta','n5blyqxEX7c'),
 ('Alongamento de Extensores de Punho','9EGl4XS1fPU'),
 ('Alongamento de Flexores de Cotovelo','NQRA2KWOHhM'),
 ('Alongamento de Trapézio Superior','oeugu_uQsQY'),
 ('Alongamento do Piriforme','BaU_-xSTbmQ'),
 ('Cadeira Abdutora','GljAOyT5xLI'),
 ('Cadeira Adutora','7Rjq9VX9pns'),
 ('Cadeira Extensora','el3oHblB5DM'),
 ('Concha (Clamshell)','K_Zx4h312uI'),
 ('Dorsiflexão com Faixa','YWranGgv_ts'),
 ('Encolhimento com Barra (Shrug)','uKJ-Ldbu8oc'),
 ('Encurtamento de Arco Plantar (Short Foot)','iy1Qxt2mnsE'),
 ('Flexão/Extensão de Punho com Peso','J_XahdfxLM8'),
 ('Mobilização de Tornozelo na Parede','qh7KaN8FRZk'),
 ('Panturrilha em Pé no Smith','Bfu6-o4QnOc'),
 ('Panturrilha no Leg Press','Ua7jx6wKyMw'),
 ('Pendular de Codman','1xBkv1n6D1g'),
 ('Rosca Bíceps com Faixa','NWkJh4bhBz8'),
 ('Rosca Inversa de Punho','svkQdgWRdNY'),
 ('Rosca de Punho com Barra','84Igm6SJ4aw'),
 ('Rotação Cervical Ativa','17M6hkRzSX0'),
 ('Rotação Externa com Faixa','ORbx5wJFdYU'),
 ('Step-Up Lateral','G0U3CUPK55U'),
 ('Remada Curvada com Barra','mxvS-iwm53o'),
 ('Rosca Bíceps com Barra','s4B8UW3BMqk'),
 ('Abdominal no Banco Declinado','HU9WcmpcQFQ'),
 ('Stiff com Barra','4_O6alBQ4wY')
)
update public.exercise_library e
set video_url = 'https://www.youtube.com/watch?v=' || f.vid
from fix f
where e.name_pt = f.nome;

delete from public.youtube_video_cache
where video_id in ('gqQ99s4Ywnw','4ZhtoOFiCnE','y-wV4Lz1yo4','5BmEGC0wF6k','7F1sD2dWq0w','SB98R2iBz4I','ClZ8YMiyiKQ','EHvOHPj0_jQ','ssJ90aOjrKs','UW0ckeHnFJI','2eLYNz3Bdqk','oxnVEAPYJNg','YGGaaKOoMag','xjRaTMQYbO4','0qw_srMb1EU','g6qbq7HWE3s','6IUOSZpPIJE','2d_Mvhj2HVg','GhVAVqO8o68','gwBY-lfTxMg','4UEBikkXsLI','R-bKeJ8pDBs','8d1wOuUaSJA','FixfaBXtgWI','StMWiFq3bGo','uPmMn1LPjHw','hMnJhSfE_p0','dQqApCGd5Ag');
