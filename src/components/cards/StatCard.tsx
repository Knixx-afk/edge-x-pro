type Props={

title:string;

value:string;

};

export default function StatCard({

title,

value

}:Props){

return(

<div className="rounded-2xl bg-[#101722] p-6">

<div className="text-gray-400">

{title}

</div>

<div className="text-3xl font-bold mt-3">

{value}

</div>

</div>

);

}