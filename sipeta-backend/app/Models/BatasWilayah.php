<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BatasWilayah extends Model
{
    protected $table = 'batas_wilayah';
    protected $primaryKey = 'gid';
    
    protected $fillable = [
        'gid_3', 'gid_0', 'country', 'gid_1', 'name_1', 'nl_name_1',
        'gid_2', 'name_2', 'nl_name_2', 'name_3', 'varname_3',
        'nl_name_3', 'type_3', 'engtype_3', 'cc_3', 'hasc_3', 'geom'
    ];
    
    public $timestamps = false;
}