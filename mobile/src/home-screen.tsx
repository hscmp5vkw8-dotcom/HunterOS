import { useCallback, useEffect, useState } from 'react';
import { Link, useFocusEffect, useRouter, type Href } from 'expo-router';
import { Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { useStore } from './store';
import { useCatalog } from './use-catalog';
import { useSocial } from './use-social';
import { fetchPublicFeed } from './social';
import { FEEDS, popularProducts, recommendedProducts, releasedProducts, type Feed, type ProductRelease, type ProductSignal } from './feed';
import { Body, Button, Card, C, Chips, ErrorText, Label, Page, ProductPhoto, s } from './ui';
import type { Product } from './types';

const tools: {title:string; description:string; route:Href; mark:string}[] = [
  {title:'Your trips',description:'Plan, pack and pick up where you left off',route:'/trips',mark:'01'},
  {title:'Loadouts',description:'Reusable setups for every activity',route:'/loadouts',mark:'02'},
  {title:'Gear catalog',description:'Browse and compare outdoor equipment',route:'/catalog',mark:'03'},
  {title:'Your locker',description:'Keep track of the gear you own',route:'/locker',mark:'04'},
  {title:'Off-road',description:'ATV, UTV and 4×4 adventures',route:'/offroad',mark:'05'},
  {title:'Scan gear',description:'Add equipment with a barcode',route:'/gear/scan',mark:'06'},
  {title:'Friends & groups',description:'Connect with your own outdoor crew',route:'/friends',mark:'07'},
  {title:'Your account',description:'Sign in, create an account or back up',route:'/account',mark:'08'},
];

function GearPreview({product,detail}:{product:Product;detail?:string}) {
  const router=useRouter();
  return <Pressable onPress={()=>router.push({pathname:'/product/[id]',params:{id:product.id}})} accessibilityRole="button" accessibilityLabel={`View ${product.name}`} style={({pressed})=>[s.card,{padding:12,width:'100%',opacity:pressed?.8:1}]}>
    <ProductPhoto product={product} height={126}/><Label>{product.brand}</Label><Text numberOfLines={2} style={[s.h2,{fontSize:18}]}>{product.model}</Text><Text style={s.small}>{detail||product.category}</Text>
  </Pressable>;
}

export default function Home() {
  const router=useRouter(),{state}=useStore(),{products}=useCatalog(),social=useSocial();
  const [feed,setFeed]=useState<Feed>('Recommended'),[group,setGroup]=useState<string|null>(null);
  const [publicFeed,setPublicFeed]=useState<{popular:ProductSignal[];releases:ProductRelease[]}>({popular:[],releases:[]});
  const [loading,setLoading]=useState(false),[error,setError]=useState(''),[refresh,setRefresh]=useState(0);
  useEffect(()=>setGroup(null),[social.userId]);
  useFocusEffect(useCallback(()=>{
    if(feed!=='Popular'&&feed!=='New releases')return;
    let current=true;setLoading(true);setError('');
    void fetchPublicFeed().then(data=>{if(current)setPublicFeed(data);}).catch(e=>{if(current){setPublicFeed({popular:[],releases:[]});setError(e instanceof Error?e.message:String(e));}}).finally(()=>{if(current)setLoading(false);});
    return()=>{current=false;};
  },[feed,refresh]));
  const recommended=recommendedProducts(products,state),popular=popularProducts(products,publicFeed.popular),releases=releasedProducts(products,publicFeed.releases);
  const posts=social.data.posts.filter(p=>group?p.group_id===group:p.group_id===null);
  return <Page>
    <View style={{paddingVertical:8,gap:7}}><Label>MAKE ROOM FOR OUTSIDE</Label><Text style={[s.title,{fontSize:32}]}>Your next adventure starts here.</Text><Body>Good gear. Your people. A plan to get out there.</Body></View>
    <View style={[s.row,{justifyContent:'space-between'}]}><View style={{flex:1}}><Button title="Build a trip" onPress={()=>router.push('/trip/new')}/></View><Link href="/friends" style={{color:C.lime,padding:12,fontWeight:'700'}}>Your crew →</Link></View>
    <View style={{gap:10}}><View style={[s.row,{justifyContent:'space-between'}]}><Text style={s.h2}>Discover</Text><Link href="/catalog" style={{color:C.lime,padding:8}}>All gear →</Link></View>
    <Chips values={[...FEEDS]} value={feed} onChange={value=>setFeed(value as Feed)}/>
    {feed==='Recommended'?<><Text style={s.small}>{state.favorites.length||state.gear.length||state.loadouts.length?'Picks based on your saved gear categories.':'A few ideas to get you started. Save gear to shape your recommendations.'}</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap:12,paddingBottom:6}}>{recommended.slice(0,4).map(p=><View key={p.id} style={{width:228}}><GearPreview product={p}/></View>)}</ScrollView></>:null}
    {feed==='Popular'||feed==='New releases'?<>
      <ErrorText message={error}/>{loading?<Body>Refreshing the feed…</Body>:error?<Button secondary title="Try again" onPress={()=>setRefresh(x=>x+1)}/>:feed==='Popular'?popular.length?<><Text style={s.small}>Community gear picks. Products appear after at least three people contribute.</Text>{popular.slice(0,6).map(p=><GearPreview key={p.product.id} product={p.product} detail={`${p.likes} like · ${p.uses} use`}/>)}</>:<Card><Text style={s.h2}>Help the good gear rise.</Text><Body>There are no community rankings yet. Open a product and choose “I like this” or “I use this” to contribute.</Body><Link href="/catalog" style={{color:C.lime,paddingVertical:10}}>Find a gear pick →</Link></Card>:releases.length?<>{releases.slice(0,6).map(p=><View key={p.product.id} style={{gap:8}}><GearPreview product={p.product} detail={`Released ${p.released_on}`}/><Button secondary title="View release source" onPress={()=>{void Linking.openURL(p.source_url).catch(()=>setError('Could not open the release source.'));}}/></View>)}</>:<Card><Text style={s.h2}>Fresh gear, confirmed.</Text><Body>New products will appear here when their release date and source are verified. Explore the catalog while we gather the first releases.</Body><Link href="/catalog" style={{color:C.lime,paddingVertical:10}}>Explore gear →</Link></Card>}
    </>:null}
    {feed==='Friends'?<>
      {!social.userId?<Card><Text style={s.h2}>A feed for your actual friends.</Text><Body>See the gear your friends choose to share. Create your account, exchange codes, and build your own circle.</Body><Link href="/account" style={{color:C.lime,paddingVertical:10}}>Sign in or create account →</Link></Card>:<>
        <ErrorText message={social.error}/><View style={s.row}><Button secondary title="Friends" onPress={()=>setGroup(null)}/>{social.data.groups.filter(g=>g.status==='accepted').map(g=><Pressable accessibilityRole="button" accessibilityState={{selected:group===g.id}} key={g.id} onPress={()=>setGroup(g.id)} style={[s.chip,group===g.id&&{borderColor:C.lime}]}><Text style={s.body}>{g.name}</Text></Pressable>)}</View>
        {social.loading?<Body>Loading shared gear…</Body>:social.error?<Button secondary title="Refresh friends feed" onPress={()=>void social.refresh()}/>:!posts.length?<Card><Text style={s.h2}>The next great find starts with your crew.</Text><Body>No shared gear here yet. Open a product to share a pick with your friends or a private group.</Body><Link href="/friends" style={{color:C.lime,paddingVertical:10}}>Manage friends & groups →</Link></Card>:posts.map(post=>{const p=products.find(p=>p.id===post.product_id);return <Card key={post.id}><Label>{post.group_name||'FRIENDS'}</Label><Text style={s.h2}>{post.name}</Text><Text style={s.small}>{new Date(post.created_at).toLocaleDateString()}</Text>{post.message?<Text selectable style={s.body}>{post.message}</Text>:null}{p?<GearPreview product={p}/>:<Body>This product is no longer in the catalog.</Body>}{post.user_id===social.userId?<Button secondary title="Remove my post" disabled={social.busy} onPress={()=>void social.act('delete_post',{id:post.id})}/>:<Link href="/feedback" style={{color:C.muted,padding:8}}>Report this post · {post.id.slice(0,8)}</Link>}</Card>;})}
      </>}
    </>:null}
    </View>
    <View style={{gap:12,paddingTop:8}}><Label>EVERYTHING IN ONE PLACE</Label><Text style={s.h2}>Make it your own.</Text><View style={{flexDirection:'row',flexWrap:'wrap',gap:10}}>{tools.map(tool=><Pressable key={tool.title} onPress={()=>router.push(tool.route)} accessibilityRole="button" accessibilityLabel={tool.title} style={({pressed})=>[s.card,{flexGrow:1,flexBasis:'46%',minWidth:140,padding:14,opacity:pressed?.75:1}]}><Label>{tool.mark}</Label><Text style={{color:C.ink,fontWeight:'700',fontSize:17}}>{tool.title}</Text><Text style={s.small}>{tool.description}</Text></Pressable>)}</View></View>
    <Text style={s.small}>Your plans save on this device. Share only what you choose.</Text>
  </Page>;
}
